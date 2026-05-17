# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-15
### Added
- Complete initial architecture including API Gateway, Frontend, and Backend replicas.
- Relational schema implemented in PostgreSQL with Alembic migrations and automated seeding.
- Redis caching for `GET /api/restaurants` and Redis Pub/Sub for real-time dispatch matching.
- Celery worker for daily batch settlement.
- Token-bucket rate limiter built from scratch using Redis Lua scripting.
- Prometheus observability integration for HTTP metrics.
- WebSocket endpoint for live order tracking.
- Single command `docker compose up -d` bring-up path.
