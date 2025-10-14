# Sapi3D

A modern 3D building visualization application with interactive first-person exploration, user authentication, achievement system, and performance tracking. Built with FastAPI, React, and PostgreSQL.

## Quick Start

```bash
./start.sh
```
This script will clean up containers, build both frontend and backend, run them, and allow you to stop them with any key press.

Then open your browser to:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/docs`
- **Database**: PostgreSQL running on `localhost:5432`

For detailed database documentation, see [DATABASE_IMPLEMENTATION.md](DATABASE_IMPLEMENTATION.md)

## Testing

### Running Backend Tests

```bash
cd backend
./run_test.sh
```

The test script will:
1. Clean up any existing containers
2. Start database and backend services
3. Wait for services to be healthy
4. Run pytest with verbose output
5. Clean up containers after tests

### Manual API Testing

Test the API endpoints using curl:

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Get Model Information:**
```bash
curl http://localhost:8000/model/info
```

**Download 3D Model:**
```bash
curl -O http://localhost:8000/model
```

**User Authentication (Coming Soon):**
```bash
# Register new user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"securepass123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"securepass123"}'

# Get current user (requires JWT token)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs` - Interactive API testing interface
- **ReDoc**: `http://localhost:8000/redoc` - Alternative documentation view
- **OpenAPI Schema**: `http://localhost:8000/openapi.json` - Machine-readable API spec

### Available Endpoints

#### Health Check
- `GET /health` - System health status and service information

#### 3D Model Management
- `GET /model` - Download the GLB format 3D building model
- `GET /model/info` - Get detailed model metadata

#### Authentication (Coming Soon)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login with JWT token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

#### User Management (Coming Soon)
- `GET /users/{user_id}` - Get user profile
- `PUT /users/{user_id}` - Update user profile
- `GET /users/{user_id}/achievements` - Get user achievements

#### Sessions (Coming Soon)
- `POST /sessions` - Start new session
- `PUT /sessions/{session_id}` - End session
- `POST /sessions/{session_id}/metrics` - Record performance metrics

#### Achievements (Coming Soon)
- `GET /achievements` - List all achievements
- `POST /achievements/{achv_id}/unlock` - Unlock achievement
- `PUT /achievements/{achv_id}/progress` - Update progress

#### Locations (Coming Soon)
- `GET /locations` - List all locations
- `GET /locations/{loc_id}` - Get location details
- `GET /locations/{loc_id}/events` - Get location events

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework with automatic API documentation
- **SQLAlchemy 2.0** - Modern ORM with async support and type hints
- **PostgreSQL** - Robust relational database
- **Alembic** - Database migration tool
- **Pydantic** - Data validation using Python type hints
- **Uvicorn** - Lightning-fast ASGI server
- **Passlib** - Password hashing with bcrypt
- **Python-Jose** - JWT token handling

### Frontend
- **React 19** - Latest React with concurrent features
- **Three.js** - 3D graphics library
- **@react-three/fiber** - React Three.js renderer
- **@react-three/drei** - Three.js helpers and abstractions
- **Vite** - Next-generation frontend build tool

### Infrastructure
- **Docker** - Containerized deployment
- **Docker Compose** - Multi-service orchestration
- **PostgreSQL 16 Alpine** - Lightweight database container
- **CORS** - Cross-origin resource sharing enabled

## Architecture

### Backend Architecture

```
┌─────────────────────────────────────────┐
│  API Layer (FastAPI)                    │
│  - Route handlers                       │
│  - Request/response validation          │
│  - Pydantic schemas                     │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│  Service Layer                          │
│  - Business logic                       │
│  - Authentication                       │
│  - Achievement calculations             │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│  Repository Layer                       │
│  - Data access logic                    │
│  - CRUD operations                      │
│  - Custom queries                       │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│  Database Layer (SQLAlchemy)            │
│  - ORM models                           │
│  - Relationships                        │
│  - Async session management             │
└─────────────────┬───────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────┐
│  PostgreSQL Database                    │
│  - 11 tables                            │
│  - Foreign key constraints              │
│  - Indexes for performance              │
└─────────────────────────────────────────┘
```
