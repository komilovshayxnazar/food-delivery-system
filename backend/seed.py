import os
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Restaurant, Menu, User, Order, Courier

def seed_db():
    db = SessionLocal()
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Clear existing data
    print("Clearing existing data...")
    db.query(Order).delete()
    db.query(Menu).delete()
    db.query(Restaurant).delete()
    db.commit()

    print("Seeding database with Tashkent restaurants...")
    
    r1 = Restaurant(name="Evos", address="Amir Temur Street, Tashkent", rating=4.8)
    r2 = Restaurant(name="Oqtepa Lavash", address="Chilonzor, Tashkent", rating=4.6)
    r3 = Restaurant(name="Rayhon Milliy Taomlar", address="Bodomzor, Tashkent", rating=4.9)
    r4 = Restaurant(name="Yapona Mama", address="Shota Rustaveli, Tashkent", rating=4.7)
    
    db.add_all([r1, r2, r3, r4])
    db.commit()

    menus = [
        # Evos
        Menu(restaurant_id=r1.id, name="Classic Lavash (Beef)", price=3.50),
        Menu(restaurant_id=r1.id, name="Cheese Lavash", price=3.80),
        Menu(restaurant_id=r1.id, name="Chicken Shaurma", price=3.20),
        Menu(restaurant_id=r1.id, name="French Fries", price=1.50),
        
        # Oqtepa Lavash
        Menu(restaurant_id=r2.id, name="Mini Lavash", price=2.50),
        Menu(restaurant_id=r2.id, name="Tandir Burger", price=3.00),
        Menu(restaurant_id=r2.id, name="Hot Dog", price=1.80),
        
        # Rayhon
        Menu(restaurant_id=r3.id, name="To'y Oshi (Palov)", price=4.50),
        Menu(restaurant_id=r3.id, name="Beef Shashlik", price=2.00),
        Menu(restaurant_id=r3.id, name="Kozon Kabob", price=5.50),
        Menu(restaurant_id=r3.id, name="Tandir Somsa", price=1.00),
        
        # Yapona Mama
        Menu(restaurant_id=r4.id, name="Philadelphia Roll", price=8.50),
        Menu(restaurant_id=r4.id, name="California Roll", price=7.50),
        Menu(restaurant_id=r4.id, name="Miso Soup", price=3.00),
    ]
    
    db.add_all(menus)
    
    # Create a test user if not exists
    if db.query(User).filter_by(username="testuser").first() is None:
        u1 = User(username="testuser", email="test@example.com")
        db.add(u1)
        
    db.commit()
    print("Database seeded successfully with Tashkent restaurants.")
    db.close()

if __name__ == "__main__":
    seed_db()
