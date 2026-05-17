# Food Delivery System

A complete multi-vendor food delivery marketplace demonstrating advanced system design principles.

Built with: **FastAPI + PostgreSQL + Redis + Celery + React/Vite + Nginx + Prometheus/Grafana**

## Quick Start (One-Command Bring-Up)

To start the entire system (Frontend, Backend replicas, Gateway, Postgres, Redis, Celery, Prometheus, Grafana), simply run:

```bash
docker compose up -d --build
```

The system will be available at:
- **Frontend / Web UI:** `http://localhost:8000`
- **API Gateway:** `http://localhost:8000/api/`
- **Interactive API Docs (Swagger):** `http://localhost:8000/api/docs`
- **Grafana Dashboard:** `http://localhost:3000`

## API Endpoints

### REST Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/restaurants` | List all restaurants with menus (cached in Redis, 60s TTL) |
| `POST` | `/api/orders` | Create a new order |
| `GET` | `/api/orders/{id}` | Get order details by ID |
| `PATCH` | `/api/orders/{id}/status` | Update order status (PENDING→ACCEPTED→PREPARING→DISPATCHED→DELIVERED) |
| `GET` | `/api/settlements` | Get all settlement records from batch processing |

### WebSocket
| Protocol | Endpoint | Description |
|----------|----------|-------------|
| WebSocket | `ws://localhost:8000/ws/orders/{id}/track` | Live order status tracking |

### Monitoring
| Endpoint | Description |
|----------|-------------|
| `/api/metrics` | Prometheus metrics (`http_requests_total`, `http_request_duration_seconds`) |

## Architecture

```
Client → Nginx Gateway (:8000) → /api/ → FastAPI Backend (2 replicas, load-balanced)
                                → /ws/  → FastAPI Backend (2 replicas, WebSocket)
                                → /     → React Frontend
```

**Services:**
- **Nginx Gateway** — routes traffic, load balances across 2 backend replicas
- **FastAPI Backend** (x2) — REST API, WebSocket, rate limiter, Prometheus metrics
- **PostgreSQL 15** — relational data (restaurants, menus, users, couriers, orders, settlements)
- **Redis 7** — caching (restaurant list, 60s TTL) + Pub/Sub (new order notifications)
- **Celery Worker** — daily settlement batch processing (every 60s for demo)
- **React Frontend** — Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Prometheus** — metrics collection
- **Grafana** — metrics visualization

## Environment Variables

The system relies on the following environment variables (handled internally via docker-compose):
- `DATABASE_URL`: The connection string for PostgreSQL.
- `REDIS_URL`: The connection string for Redis.
- `VITE_API_URL`: The base URL for the frontend to connect to the backend APIs.

## Contributor Guide

If you wish to contribute:
1. Clone the repository.
2. Install dependencies locally in `backend/` and `frontend/`.
3. Make sure to update the database schema via `alembic revision --autogenerate -m "msg"` in `backend/` if changing `models.py`.
4. Ensure all services build successfully using `docker compose build`.

## API Documentation

FastAPI automatically generates interactive OpenAPI documentation. Once the system is running, navigate to:
[http://localhost:8000/api/docs](http://localhost:8000/api/docs)
