# File Locations

## Backend Structure (`backend/app/`)

### API Layer
```
backend/app/api/routers/
├── auth_router.py      ← Authentication endpoints
├── health.py           ← Health check endpoint
├── model.py            ← 3D model serving endpoints
└── user_router.py      ← User management endpoints
```

### Service Layer
```
backend/app/services/
├── auth_service.py     ← Authentication business logic
└── user_service.py     ← User management business logic
```

### Repository Layer
```
backend/app/repositories/
├── base.py             ← BaseRepository with common CRUD
├── session_repository.py ← Session data access
└── user_repository.py  ← User data access
```

### Database Models
```
backend/app/models/
├── achievement.py      ← Achievement & UserAchievement models
├── base.py             ← Base model class
├── location.py         ← Location model
├── metrics.py          ← Metrics & MetricSnapshot models
├── session.py          ← Session & Device models
└── user.py             ← User, Role, UserRole models
```

### Pydantic Schemas
```
backend/app/schemas/
├── achievement.py      ← Achievement schemas
├── location.py         ← Location schemas
├── metrics.py          ← Metrics schemas
├── model.py            ← 3D model schemas
├── session.py          ← Session schemas
└── user.py             ← User schemas
```

### Core Configuration
```
backend/app/core/
├── config.py           ← Application settings
├── database.py         ← Database connection & session
├── logging.py          ← Logging configuration
└── security.py         ← Password hashing & JWT
```

### Static Files
```
backend/static/models/
├── sapi3D_V1.2.glb     ← Main 3D building model
└── sapi3Dasynctrigger.glb ← Alternative model
```

## Frontend Structure (`frontend/src/`)

### Components
```
frontend/src/components/
├── Login.jsx           ← Login form
├── Login.css           ← Login styles
├── Register.jsx        ← Registration form
├── Register.css        ← Registration styles
├── Navbar.jsx          ← Top navigation bar
├── Sidebar.jsx         ← Side menu
└── three/
    ├── ThreeScene.jsx  ← Main 3D scene container
    ├── Building.jsx    ← 3D model loader
    ├── PlayerMovement.js ← First-person controls
    └── Metrics.js      ← Performance tracking
```

### Services
```
frontend/src/services/
└── api.js              ← API client (axios)
```

### Main Files
```
frontend/src/
├── App.jsx             ← Main application component
├── App.css             ← Application styles
├── main.jsx            ← React entry point
└── index.css           ← Global styles
```

## Documentation (`docs/`)

```
docs/
├── index.md            ← Documentation hub
├── architecture.md     ← Architecture diagrams & details
├── api-reference.md    ← API endpoint reference
├── development-guide.md ← Development workflows
└── features.md         ← Feature documentation
```

## Configuration Files

### Root Level
```
/
├── docker-compose.base.yml   ← Base Docker config
├── docker-compose.dev.yml    ← Development overrides
├── docker-compose.prod.yml   ← Production overrides
├── .env.dev                  ← Development environment
├── .env.prod                 ← Production environment
├── run_dev.sh                ← Start development
├── run_prod.sh               ← Start production
├── stop_dev.sh               ← Stop development
├── stop_prod.sh              ← Stop production
└── logs_dev.sh               ← View development logs
```

### Backend Config
```
backend/
├── Dockerfile          ← Backend container definition
├── pyproject.toml      ← Python dependencies (Poetry)
└── run_test.sh         ← Run tests
```

### Frontend Config
```
frontend/
├── Dockerfile          ← Frontend container definition
├── nginx.conf          ← Nginx configuration (production)
├── package.json        ← Node dependencies
└── vite.config.js      ← Vite configuration
```

## Quick File Lookup

### Need to add a new endpoint?
→ `backend/app/api/routers/` (create or edit router)
→ `backend/app/main.py` (register router)

### Need to add business logic?
→ `backend/app/services/` (create or edit service)

### Need to add database queries?
→ `backend/app/repositories/` (create or edit repository)

### Need to add a database table?
→ `backend/app/models/` (create or edit model)

### Need to add API schemas?
→ `backend/app/schemas/` (create or edit schema)

### Need to add a React component?
→ `frontend/src/components/` (create component)

### Need to modify 3D scene?
→ `frontend/src/components/three/` (edit Three.js components)

## Detailed Documentation

→ Complete directory structure: `docs/architecture.md#directory-structure`
→ Adding new features: `docs/development-guide.md#adding-a-new-feature`
