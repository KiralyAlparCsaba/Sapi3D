# Validation Rules

## Critical Backend Rules

### Import Paths
**MUST** be relative to `backend/app/` (NO `app.` prefix)

✅ **CORRECT**:
```python
from core.database import get_db
from schemas.user import UserCreate
from services.user_service import UserService
from models.user import User
from repositories.user_repository import UserRepository
```

❌ **WRONG**:
```python
from app.core.database import get_db
from backend.app.schemas.user import UserCreate
```

### Password Handling
**ALWAYS** hash passwords before storing in database

```python
from core.security import hash_password, verify_password

# Hash before storing
hashed = hash_password(plain_password)

# Verify on login
is_valid = verify_password(plain_password, hashed)
```

### Database Operations
**ALWAYS** use async/await for all database operations

```python
# ✅ CORRECT
async def get_user(user_id: int, db: AsyncSession):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    return user
```

### Database Writes
**ALWAYS** commit after write operations

```python
# ✅ CORRECT
async def create_user(data: UserCreate, db: AsyncSession):
    repo = UserRepository(db)
    user = await repo.create(**data.model_dump())
    await db.commit()  # Don't forget!
    await db.refresh(user)  # Refresh to get updated data
    return user
```

### SQLAlchemy 2.0 Patterns
Use modern syntax with type hints

```python
from sqlalchemy.orm import Mapped, mapped_column

class User(Base):
    __tablename__ = "users"
    
    user_id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str]
    email: Mapped[str]
```

## Architecture Layer Rules

### API Layer (`backend/app/api/routers/`)
- Handle HTTP request/response
- Use Pydantic schemas for validation
- Inject dependencies (database session)
- NO business logic here

### Service Layer (`backend/app/services/`)
- Implement business logic
- Handle authentication/authorization
- Calculate achievements
- Enforce business rules
- NO direct database access (use repositories)

### Repository Layer (`backend/app/repositories/`)
- CRUD operations only
- Custom database queries
- Extend `BaseRepository` for common operations
- NO business logic here

### Database Layer (`backend/app/models/`)
- SQLAlchemy ORM models
- Define table structure
- Define relationships
- NO business logic here

## Docker Rules

### Always Rebuild After Code Changes
```bash
docker compose down && docker compose up --build -d
```

**Why?** Docker caches layers. Code changes won't reflect without rebuild.

## Pydantic Schema Rules

### Use `model_config` for ORM mode
```python
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    username: str
```

### Separate Create/Update/Response schemas
- `UserCreate` - For creating new records
- `UserUpdate` - For updating existing records
- `UserResponse` - For API responses

## FastAPI Dependency Injection

### Database Session
```python
from fastapi import Depends
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

async def endpoint(db: AsyncSession = Depends(get_db)):
    # Use db here
    pass
```

## Common Pitfalls to Avoid

❌ Forgetting to commit after database writes
❌ Using sync code instead of async/await
❌ Not hashing passwords before storing
❌ Wrong import paths (using `app.` prefix)
❌ Not rebuilding Docker containers after changes
❌ Putting business logic in API layer
❌ Direct database access from service layer (skip repository)

## Quick Reference

→ Detailed patterns: `docs/development-guide.md#common-patterns`
→ Architecture details: `docs/architecture.md`
→ Adding features: `docs/development-guide.md#adding-a-new-feature`
