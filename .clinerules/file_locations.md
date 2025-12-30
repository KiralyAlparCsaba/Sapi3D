# File Locations

## Backend Structure (`backend/app/`)

```
api/routers/          # FastAPI route handlers (HTTP layer)
  ├── health.py       # Health check endpoint
  ├── model.py        # 3D model serving
  └── user_router.py  # User management endpoints

services/             # Business logic layer
  └── user_service.py # User business logic

repositories/         # Data access layer (CRUD operations)
  ├── base.py         # Generic CRUD operations
  ├── user_repository.py
  └── session_repository.py

models/              # SQLAlchemy ORM models (database tables)
  ├── base.py        # Base model & mixins
  ├── user.py        # User & Role models
  ├── session.py     # Session & Device models
  ├── achievement.py # Achievement models
  ├── location.py    # Location & Event models
  └── metrics.py     # Performance metrics

schemas/             # Pydantic validation schemas (API contracts)
  ├── user.py
  ├── session.py
  ├── achievement.py
  ├── location.py
  ├── metrics.py
  └── model.py

core/                # Configuration
  ├── config.py      # Settings & environment
  ├── database.py    # Database connection
  ├── logging.py     # Logging configuration
  └── security.py    # Password hashing & JWT

static/              # Static files
  └── models/        # 3D model files (.glb)
```

## Frontend Structure (`frontend/src/`)

```
components/
  ├── Navbar.jsx     # Top navigation bar
  ├── Sidebar.jsx    # Side menu
  └── three/         # Three.js components
      ├── ThreeScene.jsx    # Main 3D scene
      ├── Building.jsx      # 3D building model
      ├── PlayerMovement.js # First-person controls
      └── Metrics.js        # Performance tracking

assets/              # Static assets

App.jsx              # Main application component
App.css              # Application styles
main.jsx             # React entry point
```

## Documentation Structure (`docs/`)

```
index.md             # Documentation hub (start here)
architecture.md      # System architecture & diagrams
api-reference.md     # API endpoints reference
development-guide.md # Developer workflows
features.md          # Feature documentation with code pointers
```

## Root Level Files

```
.clinerules/         # AI assistant quick reference (this folder)
docs/                # Human-readable documentation
backend/             # FastAPI backend
frontend/            # React frontend

DATABASE_IMPLEMENTATION.md  # Complete database schema
backend-curls.md            # Curl command examples
SCRIPTS_README.md           # Deployment scripts documentation
README.md                   # Project overview & quick start

docker-compose.dev.yml      # Development Docker config
docker-compose.prod.yml     # Production Docker config
start.sh                    # Quick start script
```

## Where to Find Things

### Need to add a new feature?
1. Model → `backend/app/models/`
2. Schema → `backend/app/schemas/`
3. Repository → `backend/app/repositories/`
4. Service → `backend/app/services/`
5. Router → `backend/app/api/routers/`

### Need to modify UI?
- React components → `frontend/src/components/`
- 3D components → `frontend/src/components/three/`
- Styles → `frontend/src/App.css`

### Need documentation?
- Start here → `docs/index.md`
- Architecture → `docs/architecture.md`
- API reference → `docs/api-reference.md`
- Development guide → `docs/development-guide.md`
