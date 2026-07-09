# Sapi3D Architecture

This document provides a visual overview of the Sapi3D system architecture.

> **Note**: For detailed architecture principles and coding standards, see [.clinerules](../.clinerules)

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                    (React 19 + Three.js)                    │
│                     Port: 3000                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Navbar     │  │   Sidebar    │  │  ThreeScene  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Building   │  │   Metrics    │  │   Movement   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                            │
│                    (FastAPI + Python 3.12)                  │
│                     Port: 8000                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Layer (Routers)                     │  │
│  │  /health  /model  /users  /sessions  /achievements  │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │           Service Layer (Business Logic)            │  │
│  │  UserService  SessionService  AchievementService    │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Repository Layer (Data Access)              │  │
│  │  UserRepo  SessionRepo  AchievementRepo  etc.       │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │        Database Layer (SQLAlchemy ORM)              │  │
│  │  Models: User, Session, Achievement, Location, etc. │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │ asyncpg
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
│                     Port: 5432                              │
│  11 Tables: users, sessions, achievements, locations, etc.  │
└─────────────────────────────────────────────────────────────┘
```

## Backend Layered Architecture

The backend follows a strict layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  API Layer (FastAPI Routes)                                 │
│  - HTTP request/response handling                           │
│  - Input validation (Pydantic schemas)                      │
│  - Dependency injection                                     │
│  📁 Location: backend/app/api/routers/                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (Business Logic)                             │
│  - Authentication & authorization                           │
│  - Achievement calculations                                 │
│  - Business rules enforcement                               │
│  📁 Location: backend/app/services/                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Repository Layer (Data Access)                             │
│  - CRUD operations                                          │
│  - Custom queries                                           │
│  - Database abstraction                                     │
│  📁 Location: backend/app/repositories/                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Database Layer (SQLAlchemy ORM)                            │
│  - ORM models                                               │
│  - Relationships                                            │
│  - Async session management                                 │
│  📁 Location: backend/app/models/                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL Database                                        │
│  - 11 tables with foreign key constraints                   │
│  - Indexes for performance                                  │
└─────────────────────────────────────────────────────────────┘
```

> **Detailed Architecture Rules**: See [.clinerules](../.clinerules#backend-layered-architecture)

## Directory Structure

### Backend Structure

```
backend/app/
├── api/
│   └── routers/          # FastAPI route handlers
│       ├── health.py     # Health check endpoint
│       ├── model.py      # 3D model serving
│       └── user_router.py # User management
├── services/             # Business logic layer
│   └── user_service.py   # User business logic
├── repositories/         # Data access layer
│   ├── base.py          # Generic CRUD operations
│   ├── user_repository.py
│   └── session_repository.py
├── models/              # SQLAlchemy ORM models
│   ├── base.py          # Base model & mixins
│   ├── user.py          # User & Role models
│   ├── session.py       # Session & Device models
│   ├── achievement.py   # Achievement models
│   ├── location.py      # Location & Event models
│   └── metrics.py       # Performance metrics
├── schemas/             # Pydantic validation schemas
│   ├── user.py
│   ├── session.py
│   ├── achievement.py
│   ├── location.py
│   ├── metrics.py
│   └── model.py
├── core/                # Core configuration
│   ├── config.py        # Settings & environment
│   ├── database.py      # Database connection
│   ├── logging.py       # Logging configuration
│   └── security.py      # Password hashing & JWT
├── static/              # Static files
│   └── models/          # 3D model files (.glb)
└── main.py              # FastAPI application entry
```

### Frontend Structure

```
frontend/src/
├── components/
│   ├── Navbar.jsx       # Top navigation bar
│   ├── Sidebar.jsx      # Side menu
│   └── three/           # Three.js components
│       ├── ThreeScene.jsx    # Main 3D scene
│       ├── Building.jsx      # 3D building model
│       ├── PlayerMovement.js # First-person controls
│       └── Metrics.js        # Performance tracking
├── assets/              # Static assets
├── App.jsx              # Main application component
├── App.css              # Application styles
└── main.jsx             # React entry point
```

> **Complete File Structure**: See project root for full directory listing

## Database Schema

### Entity Relationship Overview

```
┌──────────┐         ┌──────────┐
│   Role   │────────<│   User   │
└──────────┘         └────┬─────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ↓                 ↓                 ↓
┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│   Session    │   │UserAchievement│  │AchvProgress  │
└──────┬───────┘   └──────┬───────┘  └──────┬───────┘
       │                  │                 │
       ↓                  ↓                 ↓
┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│  PerfMetrics │   │ Achievement  │  │ Achievement  │
└──────────────┘   └──────────────┘  └──────────────┘

┌──────────┐         ┌──────────┐
│ Location │────────<│  Event   │
└──────────┘         └──────────┘

┌──────────┐
│InfoPanel │
└──────────┘

┌──────────┐         ┌──────────┐
│  Device  │────────<│ Session  │
└──────────┘         └──────────┘
```

### Tables Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **users** | User accounts & profiles | → sessions, achievements, progress |
| **roles** | User roles/permissions | ← users |
| **sessions** | User session tracking | ← users, devices → metrics |
| **devices** | Device information | ← sessions |
| **achievements** | Achievement definitions | ← user_achievements, progress |
| **user_achievements** | Unlocked achievements | ← users, achievements |
| **achv_progress** | Achievement progress | ← users, achievements |
| **locations** | Physical locations | → events |
| **events** | Location-based events | ← locations |
| **info_panels** | Information panels | (standalone) |
| **perf_metrics** | Performance metrics | ← sessions |

> **Detailed Database Documentation**: See [.clinerules/database.md](../.clinerules/database.md)

## Data Flow Examples

### User Authentication Flow

```
1. Frontend: User enters credentials
   ↓
2. POST /users/login → user_router.py
   ↓
3. UserService.authenticate()
   ↓
4. UserRepository.get_by_username()
   ↓
5. Database query via SQLAlchemy
   ↓
6. Password verification (bcrypt)
   ↓
7. JWT token generation
   ↓
8. Return token to frontend
```

### Session Tracking Flow

```
1. Frontend: User starts 3D exploration
   ↓
2. POST /sessions → session_router.py
   ↓
3. SessionService.start_session()
   ↓
4. SessionRepository.create()
   ↓
5. Database: Insert session record
   ↓
6. Frontend: Periodically send metrics
   ↓
7. POST /sessions/{id}/metrics
   ↓
8. MetricsRepository.create()
   ↓
9. Database: Insert performance data
```

## Technology Stack

### Backend
- **FastAPI** - Modern async web framework
- **SQLAlchemy 2.0** - ORM with async support
- **PostgreSQL** - Relational database
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server
- **Passlib** - Password hashing (bcrypt)
- **Python-Jose** - JWT tokens

### Frontend
- **React 19** - UI framework
- **Three.js** - 3D graphics
- **@react-three/fiber** - React Three.js renderer
- **@react-three/drei** - Three.js helpers
- **Vite** - Build tool

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-service orchestration
- **PostgreSQL 16 Alpine** - Database container

> **Complete Tech Stack Details**: See [README.md](../README.md#tech-stack)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │     │
│  │   (Nginx)    │  │  (Uvicorn)   │  │   (Alpine)   │     │
│  │   Port 3000  │  │   Port 8000  │  │   Port 5432  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Volumes:                                                   │
│  - postgres_data (persistent database)                     │
│  - backend/static (3D models)                              │
└─────────────────────────────────────────────────────────────┘
```

> **Deployment Scripts**: See [.clinerules/common_tasks.md](../.clinerules/common_tasks.md)

## Key Design Decisions

### 1. Async/Await Throughout
- All database operations use async/await
- FastAPI async endpoints
- SQLAlchemy async sessions
- Better performance for I/O operations

### 2. Repository Pattern
- Separates data access from business logic
- Reusable CRUD operations
- Easy to test and mock
- See: `backend/app/repositories/base.py`

### 3. Pydantic Validation
- Type-safe request/response handling
- Automatic API documentation
- Runtime validation
- See: `backend/app/schemas/`

### 4. Docker-First Development
- Consistent environments
- Easy setup for new developers
- Production-like development
- See: [.clinerules](../.clinerules#docker-first-development)

### 5. Connection Pooling
- 5 persistent connections
- 10 overflow connections
- Automatic connection recycling
- See: `backend/app/core/database.py`

## Related Documentation

- **Architecture Principles**: [.clinerules](../.clinerules)
- **Database Details**: [.clinerules/database.md](../.clinerules/database.md)
- **API Reference**: [api-reference.md](./api-reference.md)
- **Development Guide**: [development-guide.md](./development-guide.md)
- **Features**: [features.md](./features.md)

---

[← Back to Documentation Hub](./index.md)
