import os
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Restaurant, Menu, User

def seed_db():
    db = SessionLocal()
    # Ensure tables exist (fallback if alembic hasn't created them, though alembic should)
    Base.metadata.create_all(bind=engine)
    
    if db.query(Restaurant).count() == 0:
        print("Seeding database...")
        r1 = Restaurant(name="Pizza Palace", address="123 Main St", rating=4.5)
        r2 = Restaurant(name="Burger Barn", address="456 Elm St", rating=4.0)
        
        db.add_all([r1, r2])
        db.commit()

        m1 = Menu(restaurant_id=r1.id, name="Margherita", price=12.99)
        m2 = Menu(restaurant_id=r2.id, name="Cheeseburger", price=8.99)
        
        db.add_all([m1, m2])
        
        u1 = User(username="testuser", email="test@example.com")
        db.add(u1)
        
        db.commit()
        print("Database seeded successfully.")
    else:
        print("Database already seeded.")
    db.close()

if __name__ == "__main__":
    seed_db()
