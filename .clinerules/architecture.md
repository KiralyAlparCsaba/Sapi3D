# Architecture

## Layered Architecture Pattern

```
API Layer (FastAPI Routes)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Database Layer (SQLAlchemy ORM)
    ↓
PostgreSQL Database
```

## Layer Responsibilities

### API Layer (`backend/app/api/routers/`)
- HTTP request/response handling
- Input validation (Pydantic schemas)
- Dependency injection
- Route definitions

### Service Layer (`backend/app/services/`)
- Business logic
- Authentication & authorization
- Achievement calculations
- Business rules enforcement

### Repository Layer (`backend/app/repositories/`)
- CRUD operations
- Custom queries
- Database abstraction
- Data access logic

### Database Layer (`backend/app/models/`)
- SQLAlchemy ORM models
- Table definitions
- Relationships
- Async session management

## Key Design Decisions

### 1. Async/Await Throughout
- All database operations use async/await
- FastAPI async endpoints
- SQLAlchemy async sessions
- Better performance for I/O operations

### 2. Repository Pattern
- Separates data access from business logic
- Reusable CRUD operations in `repositories/base.py`
- Easy to test and mock

### 3. Pydantic Validation
- Type-safe request/response handling
- Automatic API documentation
- Runtime validation
- Schemas in `backend/app/schemas/`

### 4. Docker-First Development
- Consistent environments
- Easy setup for new developers
- Production-like development
- Hot reload in dev mode

### 5. Connection Pooling
- 5 persistent connections
- 10 overflow connections
- Automatic connection recycling
- See: `backend/app/core/database.py`

## Architecture Documentation

→ Detailed architecture diagrams: `docs/architecture.md`
→ Layered architecture details: `docs/architecture.md#backend-layered-architecture`
→ Data flow examples: `docs/architecture.md#data-flow-examples`
→ Directory structure: `docs/architecture.md#directory-structure`
