# Architecture

## Layered Architecture Pattern

```
┌─────────────────────────────────────┐
│   API Layer (Routers)               │  ← HTTP Request/Response
│   backend/app/api/routers/          │  ← Pydantic validation
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Service Layer                     │  ← Business logic
│   backend/app/services/             │  ← Authentication
└─────────────────────────────────────┘  ← Achievements
              ↓
┌─────────────────────────────────────┐
│   Repository Layer                  │  ← CRUD operations
│   backend/app/repositories/         │  ← Custom queries
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Database Layer (Models)           │  ← SQLAlchemy ORM
│   backend/app/models/               │  ← Table definitions
└─────────────────────────────────────┘
```

## Layer Responsibilities

### API Layer (`backend/app/api/routers/`)
- Handle HTTP request/response
- Use Pydantic schemas for validation
- Inject dependencies (database session)
- **NO business logic here**

### Service Layer (`backend/app/services/`)
- Implement business logic
- Handle authentication/authorization
- Calculate achievements
- Enforce business rules
- **NO direct database access** (use repositories)

### Repository Layer (`backend/app/repositories/`)
- CRUD operations only
- Custom database queries
- Extend `BaseRepository` for common operations
- **NO business logic here**

### Database Layer (`backend/app/models/`)
- SQLAlchemy ORM models
- Define table structure
- Define relationships
- **NO business logic here**

## Key Design Decisions

### Async/Await Throughout
All database operations use async/await for better performance:
```python
async def get_user(user_id: int, db: AsyncSession):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    return user
```

### SQLAlchemy 2.0 Modern Syntax
Using type hints and modern patterns:
```python
from sqlalchemy.orm import Mapped, mapped_column

class User(Base):
    user_id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str]
```

### Dependency Injection
FastAPI's dependency injection for database sessions:
```python
from fastapi import Depends
from core.database import get_db

async def endpoint(db: AsyncSession = Depends(get_db)):
    # Use db here
```

## Frontend Architecture

### React Component Structure
```
frontend/src/
├── components/
│   ├── Navbar.jsx          ← Top navigation
│   ├── Sidebar.jsx         ← Side menu
│   ├── Login.jsx           ← Authentication
│   ├── Register.jsx        ← User registration
│   └── three/
│       ├── ThreeScene.jsx  ← Main 3D scene
│       ├── Building.jsx    ← 3D model loader
│       ├── PlayerMovement.js ← First-person controls
│       └── Metrics.js      ← Performance tracking
└── services/
    └── api.js              ← API client
```

### Three.js Integration
- First-person camera controls
- GLB model loading
- Collision detection
- Performance metrics

## Detailed Documentation

→ Complete architecture diagrams: `docs/architecture.md`
→ Design decisions: `docs/architecture.md#design-decisions`
→ Directory structure: `docs/architecture.md#directory-structure`
