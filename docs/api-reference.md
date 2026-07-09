# API Reference

Quick reference guide for Sapi3D API endpoints.

> **Interactive Documentation**: For full interactive API testing, visit [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: TBD

## Authentication

> **Status**: 🚧 In Progress

Authentication will use JWT (JSON Web Tokens) with Bearer token authentication.

```bash
# Future authentication header format
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Health & System

#### GET /health
Check system health and service status.

**Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-12-31T01:00:00Z",
  "version": "0.1.0"
}
```

**Example**:
```bash
curl http://localhost:8000/health
```

> **Implementation**: `backend/app/api/routers/health.py`

---

### 3D Model Management

#### GET /model
Download the 3D building model in GLB format.

**Response**: `200 OK` (binary file)
- Content-Type: `model/gltf-binary`
- File: `sapi3D_V1.2.glb`

**Example**:
```bash
curl -O http://localhost:8000/model
```

#### GET /model/info
Get metadata about the 3D model.

**Response**: `200 OK`
```json
{
  "filename": "sapi3D_V1.2.glb",
  "size_mb": 2.5,
  "format": "GLB",
  "version": "1.2"
}
```

**Example**:
```bash
curl http://localhost:8000/model/info
```

> **Implementation**: `backend/app/api/routers/model.py`  
> **Models Location**: `backend/static/models/`

---

### User Management

#### POST /users/
Create a new user account.

**Request Body**:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "securepass123",
  "role_id": 1
}
```

**Response**: `201 Created`
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1,
  "created_at": "2025-12-31T01:00:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "securepass123",
    "role_id": 1
  }'
```

#### GET /users/
Get all users (with pagination).

**Query Parameters**:
- `skip` (int, default: 0) - Number of records to skip
- `limit` (int, default: 100) - Maximum records to return

**Response**: `200 OK`
```json
[
  {
    "user_id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role_id": 1
  }
]
```

**Example**:
```bash
curl "http://localhost:8000/users/?skip=0&limit=10"
```

#### GET /users/{user_id}
Get a specific user by ID.

**Path Parameters**:
- `user_id` (int) - User ID

**Response**: `200 OK`
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1,
  "avatar_url": null
}
```

**Example**:
```bash
curl http://localhost:8000/users/1
```

#### PUT /users/{user_id}
Update user information.

**Path Parameters**:
- `user_id` (int) - User ID

**Request Body** (all fields optional):
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Response**: `200 OK`

**Example**:
```bash
curl -X PUT http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"username": "newusername"}'
```

#### DELETE /users/{user_id}
Delete a user account.

**Path Parameters**:
- `user_id` (int) - User ID

**Response**: `204 No Content`

**Example**:
```bash
curl -X DELETE http://localhost:8000/users/1
```

#### POST /users/login
User login (password verification).

**Request Body**:
```json
{
  "username": "testuser",
  "password": "securepass123"
}
```

**Response**: `200 OK`
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1
}
```

**Example**:
```bash
curl -X POST http://localhost:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepass123"
  }'
```

> **Implementation**: `backend/app/api/routers/user_router.py`  
> **Service**: `backend/app/services/user_service.py`  
> **Repository**: `backend/app/repositories/user_repository.py`

---

### Sessions (Coming Soon)

> **Status**: 🚧 Planned

- `POST /sessions` - Start new session
- `PUT /sessions/{session_id}` - End session
- `GET /sessions/{session_id}` - Get session details
- `POST /sessions/{session_id}/metrics` - Record performance metrics

> **Models**: `backend/app/models/session.py`  
> **Schemas**: `backend/app/schemas/session.py`

---

### Achievements (Coming Soon)

> **Status**: 🚧 Planned

- `GET /achievements` - List all achievements
- `GET /achievements/{achv_id}` - Get achievement details
- `POST /achievements/{achv_id}/unlock` - Unlock achievement
- `PUT /achievements/{achv_id}/progress` - Update progress
- `GET /users/{user_id}/achievements` - Get user achievements

> **Models**: `backend/app/models/achievement.py`  
> **Schemas**: `backend/app/schemas/achievement.py`

---

### Locations (Coming Soon)

> **Status**: 🚧 Planned

- `GET /locations` - List all locations
- `GET /locations/{loc_id}` - Get location details
- `GET /locations/{loc_id}/events` - Get location events
- `GET /info-panels` - List information panels

> **Models**: `backend/app/models/location.py`  
> **Schemas**: `backend/app/schemas/location.py`

---

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required/failed |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error (Pydantic) |
| 500 | Internal Server Error | Server-side error |

### Example Error Response

```json
{
  "detail": "User with username 'testuser' already exists"
}
```

## Testing the API

### Using Swagger UI (Recommended)

1. Start the application: `./start.sh`
2. Open browser: [http://localhost:8000/docs](http://localhost:8000/docs)
3. Click "Try it out" on any endpoint
4. Fill in parameters and click "Execute"

### Using curl

See [backend-curls.md](../backend-curls.md) for comprehensive curl examples.

### Using httpx (Python)

```python
import httpx
import asyncio

async def test_api():
    async with httpx.AsyncClient() as client:
        # Health check
        response = await client.get("http://localhost:8000/health")
        print(response.json())
        
        # Create user
        response = await client.post(
            "http://localhost:8000/users/",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepass123",
                "role_id": 1
            }
        )
        print(response.json())

asyncio.run(test_api())
```

## API Versioning

> **Current Version**: v0.1.0

API versioning strategy will be implemented in future releases.

## Rate Limiting

> **Status**: 🚧 Planned

Rate limiting will be implemented to prevent abuse.

## CORS Configuration

CORS is enabled for development:
- **Allowed Origins**: `http://localhost:3000`
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `*`

> **Configuration**: `backend/app/core/config.py`

## Related Documentation

- **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
- **Curl Examples**: [backend-curls.md](../backend-curls.md)
- **Database Schema**: [architecture.md](./architecture.md#database-schema)
- **Architecture**: [architecture.md](./architecture.md)

---

[← Back to Documentation Hub](./index.md)
