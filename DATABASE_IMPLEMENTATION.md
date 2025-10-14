# Database Implementation Summary

## Overview
This document summarizes the database layer implementation for the Sapi3D project, covering all 11 tables from the schema diagram.

## Completed Phases

### ✅ Phase 1: Database Setup & Configuration
- **PostgreSQL Docker Service**: Added `postgres:16-alpine` container to `docker-compose.yml`
- **Database Configuration**: Added connection settings to `backend/app/core/config.py`
  - Connection URL: `postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d`
  - Connection pooling: 5 base connections + 10 overflow
- **Dependencies**: Updated `pyproject.toml` with required packages:
  - `sqlalchemy[asyncio]>=2.0.0` - ORM with async support
  - `alembic>=1.12.0` - Database migrations
  - `asyncpg>=0.29.0` - PostgreSQL async driver
  - `psycopg2-binary>=2.9.9` - PostgreSQL sync driver
  - `passlib[bcrypt]>=1.7.4` - Password hashing
  - `python-jose[cryptography]>=3.3.0` - JWT tokens
- **Database Module**: Created `backend/app/core/database.py`
  - Async engine and session factory
  - `get_db()` dependency for FastAPI
  - `init_db()` for table creation on startup
  - `close_db()` for cleanup on shutdown

### ✅ Phase 2: Database Models (SQLAlchemy 2.0)
All 11 tables implemented using modern SQLAlchemy 2.0 syntax with type hints:

#### `backend/app/models/base.py`
- `Base`: Declarative base class
- `TimestampMixin`: Adds `created_at` and `updated_at` fields

#### `backend/app/models/user.py`
1. **Role**: User roles/permissions
   - `role_id` (PK), `role_name`
2. **User**: User authentication and profile
   - `user_id` (PK), `username`, `pasw_hash`, `email`, `avatar_url`, `role_id` (FK)
   - Relationships: role, sessions, user_achievements, achievement_progress

#### `backend/app/models/session.py`
3. **Device**: Device information
   - `device_id` (PK), `device_type`, `device_name`, `os_name`
4. **Session**: User session tracking
   - `session_id` (PK), `user_id` (FK), `device_id` (FK), `started_at`, `ended_at`, `device_type`, `app_version`
   - Relationships: user, device, perf_metrics

#### `backend/app/models/achievement.py`
5. **Achievement**: Achievement definitions
   - `achv_id` (PK), `name`, `description`, `condition`
6. **UserAchievement**: Unlocked achievements
   - `id` (PK), `user_id` (FK), `achv_id` (FK), `unlocked_at`
7. **AchvProgress**: Detailed achievement progress
   - `id` (PK), `user_id` (FK), `achv_id` (FK), `panel_count`, `loc_count`, `time_spent`, `distance_walked`

#### `backend/app/models/location.py`
8. **Location**: Physical locations in the game
   - `loc_id` (PK), `name`, `button_location`, `information`
9. **Event**: Location-based events
   - `event_id` (PK), `name`, `description`, `image_path`, `loc_id` (FK)
10. **InfoPanel**: Information panels at locations
    - `panel_id` (PK), `information`, `coordinates_obj_name`, `media_url`

#### `backend/app/models/metrics.py`
11. **PerfMetrics**: Performance metrics per session
    - `metrics_id` (PK), `session_id` (FK), `timestamp`, `fps`, `memory_mb`, `latency_ms`, `cpu_gpu_usage`

### ✅ Phase 3: Database Layer (Connection & Repositories)

#### `backend/app/repositories/base.py`
- **BaseRepository**: Generic CRUD operations
  - `create(**kwargs)` - Create new record
  - `get_by_id(id)` - Get record by ID
  - `get_all(skip, limit)` - Get all with pagination
  - `update(id, **kwargs)` - Update record
  - `delete(id)` - Delete record
  - `exists(id)` - Check if record exists

#### `backend/app/repositories/user_repository.py`
- **UserRepository**: User-specific queries
  - `get_by_username(username)`
  - `get_by_email(email)`
  - `get_by_id(user_id)` - Overridden for user_id
- **RoleRepository**: Role-specific queries
  - `get_by_name(role_name)`
  - `get_by_id(role_id)` - Overridden for role_id

### ✅ Phase 4: Pydantic Schemas (API Validation)

#### `backend/app/schemas/user.py`
- **Role**: `RoleCreate`, `RoleResponse`
- **User**: `UserCreate`, `UserUpdate`, `UserResponse`, `UserWithRole`
- **Auth**: `UserLogin`, `Token`, `TokenData`

#### `backend/app/schemas/session.py`
- **Device**: `DeviceCreate`, `DeviceResponse`
- **Session**: `SessionCreate`, `SessionUpdate`, `SessionResponse`, `SessionWithDevice`

#### `backend/app/schemas/achievement.py`
- **Achievement**: `AchievementCreate`, `AchievementUpdate`, `AchievementResponse`
- **UserAchievement**: `UserAchievementCreate`, `UserAchievementResponse`, `UserAchievementWithDetails`
- **AchvProgress**: `AchvProgressCreate`, `AchvProgressUpdate`, `AchvProgressResponse`, `AchvProgressWithDetails`

#### `backend/app/schemas/location.py`
- **Location**: `LocationCreate`, `LocationUpdate`, `LocationResponse`, `LocationWithEvents`
- **Event**: `EventCreate`, `EventUpdate`, `EventResponse`
- **InfoPanel**: `InfoPanelCreate`, `InfoPanelUpdate`, `InfoPanelResponse`

#### `backend/app/schemas/metrics.py`
- **PerfMetrics**: `PerfMetricsCreate`, `PerfMetricsResponse`, `PerfMetricsSummary`

## Architecture Decisions

### 1. SQLAlchemy 2.0 Modern Syntax
- **Type hints** with `Mapped[type]` for better IDE support
- **Async/await** support built-in
- **Better error detection** at development time

### 2. Two-Layer Architecture
```
API Layer (FastAPI)
    ↓ Uses Pydantic schemas for validation
Database Layer (SQLAlchemy)
    ↓ Uses SQLAlchemy models for ORM
PostgreSQL Database
```

### 3. Repository Pattern
- Separates data access logic from business logic
- Provides reusable CRUD operations
- Easy to test and mock

### 4. Connection Pooling
- 5 persistent connections
- 10 overflow connections
- Automatic connection recycling

## Database Relationships

```
User ←→ Role (many-to-one)
User ←→ Sessions (one-to-many)
User ←→ UserAchievements (one-to-many)
User ←→ AchvProgress (one-to-many)

Session ←→ Device (many-to-one)
Session ←→ PerfMetrics (one-to-many)

Achievement ←→ UserAchievements (one-to-many)
Achievement ←→ AchvProgress (one-to-many)

Location ←→ Events (one-to-many)
```

## Next Steps (Deferred Phases)

### Phase 5: API Endpoints
- Authentication endpoints (`/auth/*`)
- User management (`/users/*`)
- Session tracking (`/sessions/*`)
- Achievement system (`/achievements/*`)
- Location data (`/locations/*`)
- Performance metrics (`/metrics/*`)

### Phase 6: Services Layer
- `auth_service.py` - Authentication, JWT, password hashing
- `achievement_service.py` - Achievement unlock logic
- `session_service.py` - Session management
- `location_service.py` - Location-based logic

### Phase 7: Database Migrations
- Initialize Alembic
- Create initial migration
- Set up migration workflow

### Phase 8: Testing Structure
- Test database setup
- Repository tests
- Endpoint tests
- Integration tests

## Usage Example

```python
from app.core.database import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate

# In FastAPI endpoint
async def create_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    user = await repo.create(
        username=user_data.username,
        email=user_data.email,
        pasw_hash=hash_password(user_data.password),
        role_id=user_data.role_id
    )
    return UserResponse.model_validate(user)
```

## Running the Application

1. **Start services**:
   ```bash
   docker-compose down && docker-compose up --build
   ```

2. **Database will be automatically initialized** on startup via the lifespan event in `main.py`

3. **Access API documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## File Structure

```
backend/app/
├── models/              # SQLAlchemy ORM models
│   ├── __init__.py
│   ├── base.py
│   ├── user.py
│   ├── session.py
│   ├── achievement.py
│   ├── location.py
│   └── metrics.py
├── repositories/        # Data access layer
│   ├── base.py
│   └── user_repository.py
├── schemas/            # Pydantic validation schemas
│   ├── __init__.py
│   ├── user.py
│   ├── session.py
│   ├── achievement.py
│   ├── location.py
│   └── metrics.py
├── core/               # Core configuration
│   ├── config.py
│   ├── database.py
│   └── logging.py
└── main.py            # FastAPI application
