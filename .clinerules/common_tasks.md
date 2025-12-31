# Common Tasks

## Docker Commands

### Start Development Environment
```bash
./run_dev.sh
```

### Start Production Environment
```bash
./run_prod.sh
```

### Stop Development Environment
```bash
./stop_dev.sh
```

### Stop Production Environment
```bash
./stop_prod.sh
```

### Rebuild After Code Changes
```bash
docker compose down && docker compose up --build -d
```

### View Logs
```bash
# All services
./logs_dev.sh

# Specific service
docker logs sapi3d-backend -f
docker logs sapi3d-frontend -f
docker logs sapi3d-db -f
```

### Access Database
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d
```

### Restart Specific Service
```bash
docker restart sapi3d-backend
docker restart sapi3d-frontend
```

## Development Workflows

### Adding a New API Endpoint

1. **Create/Edit Router** (`backend/app/api/routers/`)
2. **Create/Edit Service** (`backend/app/services/`)
3. **Create/Edit Repository** (`backend/app/repositories/`)
4. **Register Router** in `backend/app/main.py`
5. **Rebuild & Test**:
   ```bash
   docker compose down && docker compose up --build -d
   ```
6. **Test in Swagger**: http://localhost:8000/docs

### Adding a New Database Table

1. **Create Model** (`backend/app/models/`)
2. **Create Schema** (`backend/app/schemas/`)
3. **Create Repository** (`backend/app/repositories/`)
4. **Rebuild Backend**:
   ```bash
   docker compose down && docker compose up --build -d
   ```
5. **Verify Table**: 
   ```bash
   docker exec -it sapi3d-db psql -U sapi3d -d sapi3d -c "\dt"
   ```

### Adding a New React Component

1. **Create Component** (`frontend/src/components/`)
2. **Import in Parent** (e.g., `App.jsx`)
3. **Rebuild Frontend**:
   ```bash
   docker compose down && docker compose up --build -d
   ```
4. **Test**: http://localhost:3000

## Testing

### Run Backend Tests
```bash
cd backend
./run_test.sh
```

### Manual API Testing
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Curl Examples**: See `backend-curls.md`

## Debugging

### Check Container Status
```bash
docker ps
```

### Check Container Logs
```bash
docker logs sapi3d-backend --tail 100
docker logs sapi3d-frontend --tail 100
docker logs sapi3d-db --tail 100
```

### Access Backend Container Shell
```bash
docker exec -it sapi3d-backend bash
```

### Access Frontend Container Shell
```bash
docker exec -it sapi3d-frontend sh
```

### Check Database Connection
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d -c "SELECT version();"
```

### View Database Tables
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d -c "\dt"
```

## Common Issues

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :8000
sudo lsof -i :3000

# Kill process
kill -9 <PID>
```

### Docker Build Cache Issues
```bash
# Clean rebuild
docker compose down
docker system prune -a
docker compose up --build -d
```

### Database Connection Issues
```bash
# Check database is running
docker ps | grep sapi3d-db

# Check database logs
docker logs sapi3d-db

# Restart database
docker restart sapi3d-db
```

## Detailed Documentation

→ Complete workflows: `docs/development-guide.md`
→ API testing: `docs/api-reference.md#testing-the-api`
→ Troubleshooting: `docs/development-guide.md#troubleshooting`
