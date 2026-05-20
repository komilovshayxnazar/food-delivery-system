import os
import json
import stripe
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from prometheus_client import make_asgi_app, Counter, Histogram
from typing import List
import time

from .database import engine, Base, get_db
from . import models, schemas
from .core.rate_limiter import limiter, redis_client

app = FastAPI(title="Food Delivery API", version="1.0.0", root_path="/api")

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

REQUEST_COUNT = Counter("http_requests_total", "Total HTTP Requests", ["method", "endpoint", "http_status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP Request Duration", ["endpoint"])

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    if not limiter.allow_request(client_ip):
        return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, http_status=response.status_code).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(process_time)
    return response


@app.get("/restaurants", response_model=List[schemas.RestaurantOut])
def get_restaurants(db: Session = Depends(get_db)):
    """
    Get a list of restaurants.
    """
    cache_key = "restaurants:all"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    restaurants = db.query(models.Restaurant).all()
    res_list = []
    for r in restaurants:
        res_list.append({"id": r.id, "name": r.name, "address": r.address, "rating": r.rating, "menus": [{"id": m.id, "name": m.name, "price": m.price} for m in r.menus]})
    
    redis_client.setex(cache_key, 60, json.dumps(res_list))
    return restaurants

@app.post("/orders", response_model=schemas.OrderOut)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order.
    """
    db_order = models.Order(
        user_id=order.user_id,
        restaurant_id=order.restaurant_id,
        total_amount=order.total_amount,
        status=models.OrderStatus.PENDING
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    redis_client.publish("new_orders", json.dumps({"order_id": db_order.id, "restaurant_id": db_order.restaurant_id}))

    return db_order

stripe.api_key = os.getenv("STRIPE_API_KEY", "")

@app.post("/create-checkout-session")
async def create_checkout_session(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        order_id = data.get("order_id")
        amount = data.get("amount")

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'Food Delivery Order #{order_id}',
                        },
                        'unit_amount': int(amount * 100),
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url='http://localhost:8000/?success=true',
            cancel_url='http://localhost:8000/?canceled=true',
            client_reference_id=str(order_id)
        )
        return {"id": checkout_session.id, "url": checkout_session.url}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@app.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    payload = await request.body()
    event = None
    
    try:
        event = stripe.Event.construct_from(
          json.loads(payload), stripe.api_key
        )
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    if event.type == 'checkout.session.completed':
        session = event.data.object
        order_id = session.get('client_reference_id')
        
        if order_id:
            db_order = db.query(models.Order).filter(models.Order.id == int(order_id)).first()
            if db_order:
                db_order.status = models.OrderStatus.ACCEPTED
                db.commit()
                await manager.broadcast_status(int(order_id), "ACCEPTED")

    return {"status": "success"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, order_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[order_id] = websocket

    def disconnect(self, order_id: int):
        if order_id in self.active_connections:
            del self.active_connections[order_id]

    async def broadcast_status(self, order_id: int, status: str):
        if order_id in self.active_connections:
            await self.active_connections[order_id].send_text(json.dumps({"order_id": order_id, "status": status}))

manager = ConnectionManager()

@app.websocket("/ws/orders/{order_id}/track")
async def websocket_endpoint(websocket: WebSocket, order_id: int):
    """
    WebSocket endpoint for live order status updates.
    """
    await manager.connect(order_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(order_id)
