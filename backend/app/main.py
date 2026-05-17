import os
import json
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from prometheus_client import make_asgi_app, Counter, Histogram
from typing import List
import time

from .database import engine, Base, get_db
from . import models, schemas
from .core.rate_limiter import limiter, redis_client

# We set root_path="/api" so Swagger UI knows its base URL behind Nginx
app = FastAPI(title="Food Delivery API", version="1.0.0", root_path="/api")

# R12: Observability (Prometheus Metrics)
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

REQUEST_COUNT = Counter("http_requests_total", "Total HTTP Requests", ["method", "endpoint", "http_status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP Request Duration", ["endpoint"])

@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # R11: Apply rate limiter
    if not limiter.allow_request(client_ip):
        return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, http_status=response.status_code).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(process_time)
    return response


# R4: RESTful API Endpoints
# Endpoints are relative to root_path, so /restaurants translates to /api/restaurants from the outside
@app.get("/restaurants", response_model=List[schemas.RestaurantOut])
def get_restaurants(db: Session = Depends(get_db)):
    """
    Get a list of restaurants. Includes R6 caching optimization.
    """
    # R6: Caching optimization
    cache_key = "restaurants:all"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    restaurants = db.query(models.Restaurant).all()
    # Serialize for cache
    res_list = []
    for r in restaurants:
        res_list.append({"id": r.id, "name": r.name, "address": r.address, "rating": r.rating, "menus": [{"id": m.id, "name": m.name, "price": m.price} for m in r.menus]})
    
    redis_client.setex(cache_key, 60, json.dumps(res_list))
    return restaurants

@app.post("/orders", response_model=schemas.OrderOut)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order and notify couriers via Redis pub/sub.
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

    # R5: Polyglot Persistence (Redis as message broker/pubsub)
    # Publishing to a Redis channel for real-time dispatch matching
    redis_client.publish("new_orders", json.dumps({"order_id": db_order.id, "restaurant_id": db_order.restaurant_id}))

    return db_order

# R7: Additional API Style (WebSockets) for Live Order Tracking
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
            # In a real scenario, couriers would update status and we'd broadcast
    except WebSocketDisconnect:
        manager.disconnect(order_id)
