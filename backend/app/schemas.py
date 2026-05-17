from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .models import OrderStatus

class MenuBase(BaseModel):
    name: str
    price: float

class MenuOut(MenuBase):
    id: int
    class Config:
        orm_mode = True

class RestaurantBase(BaseModel):
    name: str
    address: str

class RestaurantOut(RestaurantBase):
    id: int
    rating: float
    menus: List[MenuOut] = []
    class Config:
        orm_mode = True

class OrderCreate(BaseModel):
    user_id: int
    restaurant_id: int
    total_amount: float

class OrderOut(BaseModel):
    id: int
    user_id: int
    restaurant_id: int
    courier_id: Optional[int]
    status: OrderStatus
    total_amount: float
    created_at: datetime
    class Config:
        orm_mode = True
