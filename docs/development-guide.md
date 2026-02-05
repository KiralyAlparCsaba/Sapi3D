# Development Guide

Quick reference for common development workflows and commands.

> **Detailed Guidelines**: See [.clinerules](../.clinerules) for comprehensive coding standards and best practices.

## Quick Start

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:KiralyAlparCsaba/Sapi3D.git
   cd Sapi3D
   ```

2. **Start the application**
   ```bash
   ./start.sh
   ```
   This script will:
   - Clean up any existing containers
   - Build frontend and backend
   - Start all services (frontend, backend, database)
   - Wait for your input to stop

3. **Access the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Database: `postgresql://localhost:5432/sapi3d`

> **Complete Setup**: See [README.md](../README.md#quick-start)

## Docker Workflow

### Essential Commands

```bash
# Start all services (recommended)
./start.sh

# Or manually with docker compose
docker compose up --build -d

# Stop all services
docker compose down

# Rebuild after code changes (IMPORTANT!)
docker compose down && docker compose up --build -d

# View logs
docker logs sapi3d-backend -f
docker logs sapi3d-frontend -f
docker logs sapi3d-db -f

# Execute commands in container
docker exec -it sapi3d-backend bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d

# Clean up everything (including volumes)
docker compose down -v
```

> **Script Documentation**: See [SCRIPTS_README.md](../SCRIPTS_README.md)

### Development vs Production

```bash
# Development mode (default)
docker compose -f docker-compose.dev.yml up --build -d

# Production mode
docker compose -f docker-compose.prod.yml up --build -d
```

## Mobile Testing

### Quick Start for Mobile Development

The application includes full mobile support with touch controls (dual joysticks for movement and camera control). To test on mobile devices:

```bash
# Start mobile development mode
./run_mobile_dev.sh

# Stop mobile development mode
./stop_mobile_dev.sh
```

### What `run_mobile_dev.sh` Does

1. **Starts backend services** (database + API) with Docker
2. **Starts frontend** with Vite in network-exposed mode (`--host` flag)
3. **Auto-detects your local IP** address
4. **Displays mobile access URL** and QR code (if `qrencode` is installed)
5. **Keeps services running** until you press Ctrl+C

### Mobile Testing Workflow

1. **Start the mobile dev environment**:
   ```bash
   ./run_mobile_dev.sh
   ```

2. **Connect your mobile device** to the same WiFi network as your computer

3. **Access the app** on your mobile device:
   - The script will display your local IP (e.g., `http://192.168.1.100:5173`)
   - Open this URL in your mobile browser
   - Or scan the QR code if displayed

4. **Test mobile features**:
   - Dual joystick controls (movement + camera)
   - Touch interactions
   - Performance on mobile hardware
   - Responsive UI elements

5. **Stop services** when done:
   - Press `Ctrl+C` in the terminal (auto-cleanup)
   - Or run `./stop_mobile_dev.sh` in another terminal

### Mobile-Specific Features

The app automatically detects mobile devices and provides:

- **Dual Joystick Controls**:
  - Right joystick: Movement (WASD equivalent)
  - Left joystick: Camera look (mouse equivalent)
- **Touch-optimized UI**: Larger touch targets
- **Adjusted movement speed**: Optimized for mobile controls
- **Mobile-specific camera controls**: Custom PointerLock alternative

### Troubleshooting Mobile Testing

#### Cannot Access from Mobile Device

**Problem**: Mobile device can't reach the app

**Solutions**:
1. Ensure both devices are on the same WiFi network
2. Check firewall settings on your computer
3. Verify the IP address is correct: `ip addr` (Linux) or `ipconfig` (Windows)
4. Try accessing the backend directly: `http://YOUR_IP:8000/health`

#### QR Code Not Showing

**Problem**: No QR code displayed in terminal

**Solution**: Install `qrencode`
```bash
# Ubuntu/Debian
sudo apt install qrencode

# macOS
brew install qrencode
```

#### Mobile Controls Not Working

**Problem**: Joysticks not appearing or not responding

**Solutions**:
1. Check browser console for errors (use remote debugging)
2. Ensure device is detected as mobile (check User-Agent)
3. Try refreshing the page
4. Clear browser cache on mobile device

#### Backend API Not Accessible from Mobile

**Problem**: Frontend loads but API calls fail

**Solution**: Update API base URL in `frontend/src/services/api.js` to use your local IP instead of `localhost`

### Optional: QR Code for Easy Access

Install `qrencode` to get automatic QR code generation:

```bash
# Ubuntu/Debian
sudo apt install qrencode

# macOS
brew install qrencode
```

The script will automatically display a QR code you can scan with your phone's camera.

## Backend Development

### Project Structure

```
backend/app/
├── api/routers/     # FastAPI endpoints
├── services/        # Business logic
├── repositories/    # Data access
├── models/          # SQLAlchemy ORM
├── schemas/         # Pydantic validation
└── core/            # Configuration
```

### Adding a New Feature

Follow the layered architecture pattern:

1. **Create Model** (`models/feature.py`)
   ```python
   from sqlalchemy.orm import Mapped, mapped_column
   from models.base import Base, TimestampMixin
   
   class Feature(Base, TimestampMixin):
       __tablename__ = "features"
       
       feature_id: Mapped[int] = mapped_column(primary_key=True)
       name: Mapped[str]
   ```

2. **Create Schema** (`schemas/feature.py`)
   ```python
   from pydantic import BaseModel, ConfigDict
   
   class FeatureCreate(BaseModel):
       name: str
   
   class FeatureResponse(BaseModel):
       model_config = ConfigDict(from_attributes=True)
       
       feature_id: int
       name: str
   ```

3. **Create Repository** (`repositories/feature_repository.py`)
   ```python
   from repositories.base import BaseRepository
   from models.feature import Feature
   
   class FeatureRepository(BaseRepository[Feature]):
       def __init__(self, db: AsyncSession):
           super().__init__(Feature, db)
   ```

4. **Create Service** (`services/feature_service.py`)
   ```python
   from repositories.feature_repository import FeatureRepository
   
   class FeatureService:
       def __init__(self, db: AsyncSession):
           self.db = db
           self.repo = FeatureRepository(db)
       
       async def create_feature(self, data: FeatureCreate):
           feature = await self.repo.create(name=data.name)
           await self.db.commit()
           await self.db.refresh(feature)
           return feature
   ```

5. **Create Router** (`api/routers/feature_router.py`)
   ```python
   from fastapi import APIRouter, Depends
   from core.database import get_db
   from services.feature_service import FeatureService
   
   router = APIRouter(prefix="/features")
   
   @router.post("/", response_model=FeatureResponse)
   async def create_feature(
       data: FeatureCreate,
       db: AsyncSession = Depends(get_db)
   ):
       service = FeatureService(db)
       return await service.create_feature(data)
   ```

6. **Register Router** (`main.py`)
   ```python
   from api.routers import feature_router
   app.include_router(feature_router.router, tags=["features"])
   ```

> **Architecture Details**: See [architecture.md](./architecture.md#backend-layered-architecture)

### Common Patterns

#### Database Operations
```python
# Always use async/await
async def get_user(user_id: int, db: AsyncSession):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    return user

# Always commit after writes
async def create_user(data: UserCreate, db: AsyncSession):
    repo = UserRepository(db)
    user = await repo.create(**data.model_dump())
    await db.commit()  # Don't forget!
    await db.refresh(user)
    return user
```

#### Password Hashing
```python
from core.security import hash_password, verify_password

# Hash before storing
hashed = hash_password(plain_password)

# Verify on login
is_valid = verify_password(plain_password, hashed)
```

#### Import Paths
```python
# ✅ CORRECT - Relative to backend/app/
from core.database import get_db
from schemas.user import UserCreate
from services.user_service import UserService

# ❌ WRONG
from app.core.database import get_db
from backend.app.schemas.user import UserCreate
```

> **Coding Standards**: See [.clinerules](../.clinerules#backend-development)

## Frontend Development

### Project Structure

```
frontend/src/
├── components/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── three/          # Three.js components
├── assets/
├── App.jsx
└── main.jsx
```

### Working with Three.js

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function ThreeScene() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <OrbitControls />
      {/* Your 3D content */}
    </Canvas>
  )
}
```

### API Integration

```javascript
// Using fetch
const response = await fetch('http://localhost:8000/users/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, email, password, role_id: 1 })
})
const data = await response.json()
```

> **Frontend Standards**: See [.clinerules](../.clinerules#frontend-development)

## Testing

### Backend Tests

```bash
# Run all tests
cd backend
./run_test.sh

# Or manually
docker compose -f docker-compose.test.yml up --build

# Run specific test
docker exec -it sapi3d-backend pytest tests/test_example.py -v
```

### Writing Tests

```python
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/users/", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "pass123",
            "role_id": 1
        })
        assert response.status_code == 201
        assert response.json()["username"] == "testuser"
```

> **Testing Guide**: See [README.md](../README.md#testing)

## Database Management

### Connecting to Database

```bash
# Via Docker
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d

# Common queries
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
```

### Database Migrations (Future)

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

> **Database Documentation**: See [DATABASE_IMPLEMENTATION.md](../DATABASE_IMPLEMENTATION.md)

## Debugging

### Backend Debugging

```bash
# View logs
docker logs sapi3d-backend -f

# Check if service is running
curl http://localhost:8000/health

# Access container shell
docker exec -it sapi3d-backend bash

# Check Python environment
docker exec -it sapi3d-backend python --version
docker exec -it sapi3d-backend pip list
```

### Frontend Debugging

```bash
# View logs
docker logs sapi3d-frontend -f

# Check if service is running
curl http://localhost:3000

# Access container shell
docker exec -it sapi3d-frontend sh
```

### Common Issues

#### Container Not Updating
**Problem**: Code changes not reflected in running container

**Solution**: Always rebuild after changes
```bash
docker compose down && docker compose up --build -d
```

#### Import Errors
**Problem**: `ModuleNotFoundError: No module named 'services'`

**Solution**: Check import paths (relative to `backend/app/`)
```python
# ✅ Correct
from services.user_service import UserService

# ❌ Wrong
from app.services.user_service import UserService
```

#### Database Connection Failed
**Problem**: `could not connect to server`

**Solution**: Ensure database is running
```bash
docker logs sapi3d-db
docker compose up db -d
```

#### Password Not Hashing
**Problem**: Plain text passwords in database

**Solution**: Always hash before storing
```python
from core.security import hash_password
hashed = hash_password(user_data.password)
```

> **Troubleshooting**: See [.clinerules](../.clinerules#common-pitfalls--solutions)

## Git Workflow

### Branch Strategy

```bash
# Main branches
main              # Production-ready code
LayeredArchitecture  # Current feature branch

# Create feature branch
git checkout -b feature/feature-name

# Create bugfix branch
git checkout -b fix/bug-description
```

### Commit Messages

```bash
# Format: <type>: <description>

git commit -m "feat: Add user authentication service layer"
git commit -m "fix: Resolve import path mismatch in user_router"
git commit -m "docs: Update API documentation for user endpoints"
git commit -m "refactor: Improve error handling in user service"
git commit -m "test: Add integration tests for user API"
```

> **Git Workflow**: See [.clinerules](../.clinerules#git-workflow)

## Deployment

### Development Deployment

```bash
./run_dev.sh
```

### Production Deployment

```bash
./run_prod.sh
```

### Environment Variables

```bash
# Development (.env.dev)
DATABASE_URL=postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d
CORS_ORIGINS=["http://localhost:3000"]

# Production (.env.prod)
DATABASE_URL=postgresql+asyncpg://user:pass@prod-db:5432/sapi3d
CORS_ORIGINS=["https://yourdomain.com"]
```

> **Deployment Details**: See [SCRIPTS_README.md](../SCRIPTS_README.md)

## Useful Resources

### Documentation
- **FastAPI**: https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0**: https://docs.sqlalchemy.org/en/20/
- **Pydantic**: https://docs.pydantic.dev/
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber
- **Docker Compose**: https://docs.docker.com/compose/

### Project Documentation
- [Architecture Overview](./architecture.md)
- [API Reference](./api-reference.md)
- [Features Documentation](./features.md)
- [Database Schema](../DATABASE_IMPLEMENTATION.md)
- [Coding Standards](../.clinerules)

---

[← Back to Documentation Hub](./index.md)
