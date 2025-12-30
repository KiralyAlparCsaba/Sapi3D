# Backend API Testing with cURL

This document contains cURL commands to test all the user management endpoints in the Sapi3D backend API.

## Prerequisites

- Backend must be running on `http://localhost:8000`
- Use these commands in order for the best testing experience

## 1. Health Check

Verify the backend is running:

```bash
curl http://localhost:8000/health
```

**Expected Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Sapi3D Backend API",
  "version": "0.1.0"
}
```

---

## 2. Create Users

### Create First User (Regular User)

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

**Expected Response (201 Created):**
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1,
  "avatar_url": null,
  "created_at": "2025-10-23T06:30:00.000000",
  "updated_at": "2025-10-23T06:30:00.000000"
}
```

### Create Second User (Admin)

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "adminpass123",
    "role_id": 2
  }'
```

### Create Third User

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "john123",
    "role_id": 1
  }'
```

---

## 3. List Users

### Get All Users

```bash
curl http://localhost:8000/users/
```

### Get Users with Pagination

```bash
curl "http://localhost:8000/users/?skip=0&limit=10"
```

**Expected Response (200 OK):**
```json
[
  {
    "user_id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role_id": 1,
    "avatar_url": null,
    "created_at": "2025-10-23T06:30:00.000000",
    "updated_at": "2025-10-23T06:30:00.000000"
  },
  {
    "user_id": 2,
    "username": "admin",
    "email": "admin@example.com",
    "role_id": 2,
    "avatar_url": null,
    "created_at": "2025-10-23T06:30:15.000000",
    "updated_at": "2025-10-23T06:30:15.000000"
  }
]
```

---

## 4. Get User by ID

### Get User ID 1

```bash
curl http://localhost:8000/users/1
```

### Get User ID 2

```bash
curl http://localhost:8000/users/2
```

**Expected Response (200 OK):**
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1,
  "avatar_url": null,
  "created_at": "2025-10-23T06:30:00.000000",
  "updated_at": "2025-10-23T06:30:00.000000"
}
```

**Error Response (404 Not Found):**
```json
{
  "detail": "User not found"
}
```

---

## 5. Update User

### Update User Email

```bash
curl -X PUT http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com"
  }'
```

### Update User Avatar

```bash
curl -X PUT http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

### Update Multiple Fields

```bash
curl -X PUT http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "updated@example.com",
    "avatar_url": "https://example.com/new-avatar.jpg"
  }'
```

**Expected Response (200 OK):**
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "updated@example.com",
  "role_id": 1,
  "avatar_url": "https://example.com/new-avatar.jpg",
  "created_at": "2025-10-23T06:30:00.000000",
  "updated_at": "2025-10-23T06:35:00.000000"
}
```

---

## 6. User Authentication

### Successful Login

```bash
curl -X POST http://localhost:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepass123"
  }'
```

**Expected Response (200 OK):**
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "role_id": 1,
  "avatar_url": null,
  "created_at": "2025-10-23T06:30:00.000000",
  "updated_at": "2025-10-23T06:30:00.000000"
}
```

### Failed Login (Wrong Password)

```bash
curl -X POST http://localhost:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "wrongpassword"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "detail": "Invalid username or password"
}
```

### Failed Login (Non-existent User)

```bash
curl -X POST http://localhost:8000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nonexistent",
    "password": "somepassword"
  }'
```

---

## 7. Error Cases

### Test Duplicate Username

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "another@example.com",
    "password": "pass123",
    "role_id": 1
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "detail": "Username already exists"
}
```

### Test Duplicate Email

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "anotheruser",
    "email": "test@example.com",
    "password": "pass123",
    "role_id": 1
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "detail": "Email already exists"
}
```

### Test Invalid Email Format

```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "invalid-email",
    "password": "pass123",
    "role_id": 1
  }'
```

**Expected Response (422 Unprocessable Entity):**
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "input": "invalid-email"
    }
  ]
}
```

---

## 8. Delete User

### Delete User by ID

```bash
curl -X DELETE http://localhost:8000/users/3
```

**Expected Response (204 No Content):**
```
(Empty response body)
```

### Verify Deletion

```bash
curl http://localhost:8000/users/3
```

**Expected Response (404 Not Found):**
```json
{
  "detail": "User not found"
}
```

---

## 9. Additional Endpoints

### Get Model Information

```bash
curl http://localhost:8000/model/info
```

### Download 3D Model

```bash
curl -O http://localhost:8000/model
```

### API Documentation

Open in browser:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

---

## Testing Workflow

**Recommended testing order:**

1. ✅ Health check - Verify backend is running
2. ✅ Create 2-3 users - Test user creation
3. ✅ List all users - Verify users were created
4. ✅ Get user by ID - Test individual user retrieval
5. ✅ Update user - Test user modification
6. ✅ Login with correct credentials - Test authentication
7. ✅ Login with wrong credentials - Test error handling
8. ✅ Test duplicate username/email - Test validation
9. ✅ Delete a user - Test deletion
10. ✅ Verify deletion - Confirm user was removed

---

## Tips & Tricks

### Pretty Print JSON with jq

```bash
curl http://localhost:8000/users/ | jq
```

### Verbose Output

```bash
curl -v http://localhost:8000/users/1
```

### Save Response to File

```bash
curl http://localhost:8000/users/ > users.json
```

### Include Response Headers

```bash
curl -i http://localhost:8000/users/1
```

### Silent Mode (No Progress Bar)

```bash
curl -s http://localhost:8000/users/ | jq
```

### Follow Redirects

```bash
curl -L http://localhost:8000/users/1
```

### Set Custom Headers

```bash
curl -H "Accept: application/json" \
     -H "User-Agent: MyApp/1.0" \
     http://localhost:8000/users/
```

---

## Troubleshooting

### Connection Refused

If you get "Connection refused":
```bash
# Check if backend is running
docker ps | grep sapi3d-backend

# Check backend logs
docker logs sapi3d-backend

# Restart backend
docker restart sapi3d-backend
```

### 404 Not Found on All Endpoints

Check if you're using the correct port:
```bash
# Backend should be on port 8000
curl http://localhost:8000/health
```

### Database Errors

If you see database connection errors:
```bash
# Check if database is running
docker ps | grep sapi3d-db

# Restart all services
docker compose down && docker compose up -d
```

---

## HTTP Status Codes Reference

- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **204 No Content** - Request succeeded, no content to return
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication failed
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Validation error
- **500 Internal Server Error** - Server error

---

## Notes

- All passwords are hashed with bcrypt before storage
- User IDs are auto-incremented integers
- Timestamps are in ISO 8601 format
- The API uses JSON for all request/response bodies
- CORS is enabled for all origins in development

---

**Last Updated:** 2025-10-23  
**API Version:** 0.1.0  
**Backend URL:** http://localhost:8000
