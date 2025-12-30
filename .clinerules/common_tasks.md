# Common Tasks

## Docker Commands

### Start/Stop
```bash
./start.sh                    # Start all services (recommended)
docker compose down           # Stop all services
docker compose down -v        # Stop and remove volumes
```

### Rebuild (IMPORTANT!)
```bash
docker compose down && docker compose up --build -d
```
**Always rebuild after code changes!**

### View Logs
```bash
docker logs sapi3d-backend -f
docker logs sapi3d-frontend -f
docker logs sapi3d-db -f
```

### Execute Commands in Container
```bash
docker exec -it sapi3d-backend bash
docker exec -it sapi3d-frontend sh
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d
```

## Development Workflows

### Adding a New Feature
→ Step-by-step guide: `docs/development-guide.md#adding-a-new-feature`

**Pattern**: Model → Schema → Repository → Service → Router

1. Create Model (`backend/app/models/`)
2. Create Schema (`backend/app/schemas/`)
3. Create Repository (`backend/app/repositories/`)
4. Create Service (`backend/app/services/`)
5. Create Router (`backend/app/api/routers/`)
6. Register Router in `backend/app/main.py`

### Testing

```bash
# Run backend tests
cd backend && ./run_test.sh

# Test API interactively
# Open: http://localhost:8000/docs
```

→ Testing guide: `docs/development-guide.md#testing`

### Database Operations

```bash
# Connect to database
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d

# Common queries
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;
```

→ Database usage: `DATABASE_IMPLEMENTATION.md#usage-example`

## Debugging

### Check Service Status
```bash
# Health check
curl http://localhost:8000/health

# Check if frontend is running
curl http://localhost:3000
```

### View Container Logs
```bash
docker logs sapi3d-backend -f
docker logs sapi3d-frontend -f
docker logs sapi3d-db -f
```

### Access Container Shell
```bash
docker exec -it sapi3d-backend bash
docker exec -it sapi3d-frontend sh
```

→ Debugging guide: `docs/development-guide.md#debugging`
→ Common issues: `docs/development-guide.md#common-issues`

## Quick References

### API Testing
- Interactive docs: http://localhost:8000/docs
- Curl examples: `backend-curls.md`
- API reference: `docs/api-reference.md`

### Understanding Code
- Feature mapping: `docs/features.md`
- Architecture: `docs/architecture.md`
- File structure: `.clinerules/file_locations.md`

### Deployment
- Scripts documentation: `SCRIPTS_README.md`
- Development mode: `./run_dev.sh`
- Production mode: `./run_prod.sh`
