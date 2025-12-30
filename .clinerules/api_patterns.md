# API Patterns

## Interactive API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## API Endpoints Reference

→ Complete API reference: `docs/api-reference.md`
→ Curl examples: `backend-curls.md`

## Current Endpoints

### Health & System
- `GET /health` - System health check

### 3D Model Management
- `GET /model` - Download GLB model
- `GET /model/info` - Get model metadata

### User Management
- `POST /users/` - Create user
- `GET /users/` - List users (paginated)
- `GET /users/{user_id}` - Get user details
- `PUT /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user
- `POST /users/login` - User login

## Testing the API

### Using Swagger UI (Recommended)
1. Start application: `./start.sh`
2. Open: http://localhost:8000/docs
3. Click "Try it out" on any endpoint
4. Fill parameters and click "Execute"

### Using curl
→ See examples: `backend-curls.md`
→ See examples: `docs/api-reference.md#testing-the-api`

## API Implementation Pattern

When adding new endpoints, follow this pattern:

1. **Create Router** (`backend/app/api/routers/`)
2. **Use Service Layer** (`backend/app/services/`)
3. **Use Repository Layer** (`backend/app/repositories/`)
4. **Register Router** in `backend/app/main.py`

→ Detailed guide: `docs/development-guide.md#adding-a-new-feature`

## CORS Configuration

- **Allowed Origins**: `http://localhost:3000`
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `*`

→ Configuration: `backend/app/core/config.py`
