# Project Overview

## What is Sapi3D?

3D building visualization application with interactive first-person exploration, gamification features (achievements, progress tracking, session management).

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL
- **Frontend**: React 19 + Three.js + Vite
- **Infrastructure**: Docker + Docker Compose
- **Database**: PostgreSQL 16 Alpine

## Quick Constants

### Docker Containers
- Backend: `sapi3d-backend`
- Frontend: `sapi3d-frontend`
- Database: `sapi3d-db`

### Ports
- Backend API: `8000`
- Frontend: `3000`
- PostgreSQL: `5432`

### Database Connection
- URL: `postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d`
- User: `sapi3d`
- Password: `sapi3d_password`
- Database: `sapi3d`

### Base Paths
- Backend code: `backend/app/`
- Frontend code: `frontend/src/`
- 3D models: `backend/static/models/`
- Documentation: `docs/`

## Implementation Status

### ✅ Complete
- Database setup & models (all 11 tables)
- User CRUD operations
- 3D model serving
- Health monitoring
- Basic UI (Navbar, Sidebar, 3D scene)

### 🚧 In Progress
- JWT authentication
- User management (basic done, auth pending)

### 📋 Planned
- Session tracking
- Performance metrics
- Achievement system
- Location features

## Key URLs

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Detailed Documentation

→ Full architecture: `docs/architecture.md`
→ Feature roadmap: `docs/features.md`
→ Development guide: `docs/development-guide.md`
