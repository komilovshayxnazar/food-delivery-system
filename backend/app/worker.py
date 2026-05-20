import os
from celery import Celery
from .database import SessionLocal
from .models import Order, OrderStatus
import time

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("worker", broker=redis_url, backend=redis_url)

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(60.0, daily_settlement_batch.s(), name='run-daily-settlement')

@celery_app.task
def daily_settlement_batch():
    """
    Calculate daily settlements for all restaurants based on DELIVERED orders.
    """
    db = SessionLocal()
    try:
        print("Running daily settlement batch...")
        orders = db.query(Order).filter(Order.status == OrderStatus.DELIVERED).all()
        settlements = {}
        for order in orders:
            settlements[order.restaurant_id] = settlements.get(order.restaurant_id, 0) + order.total_amount
        
        for restaurant_id, amount in settlements.items():
            print(f"Settling ${amount} for restaurant {restaurant_id}")
    finally:
        db.close()
