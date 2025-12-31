# Sapi3D Run Scripts Documentation

This document explains the different run scripts available for the Sapi3D project.

## Available Scripts

### 🔧 `run_dev.sh` - Development Mode

**Purpose**: Start the application in development mode with hot reload and live code changes.

**Features**:
- ✅ **Hot Reload**: Backend automatically restarts on code changes (uvicorn --reload)
- ✅ **HMR (Hot Module Replacement)**: Frontend updates instantly without page refresh
- ✅ **Source Code Mounted**: All changes to source files are immediately reflected
- ✅ **Vite Dev Server**: Fast development server with optimized rebuilds
- ✅ **Foreground Mode**: Logs visible in terminal for easy debugging
- ✅ **Same Dockerfile**: Uses production Dockerfile with volume mounts

**Usage**:
```bash
./run_dev.sh
```

**What it does**:
1. Cleans up any existing containers
2. Builds containers using `docker-compose.dev.yml`
3. Mounts source code as volumes for hot reload
4. Overrides CMD to enable `--reload` flag
5. Runs in foreground with live logs
6. Press `Ctrl+C` to stop

**Access Points**:
- Frontend: http://localhost:3000 (Vite dev server on port 5173, mapped to 3000)
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Best for**:
- Active development
- Testing new features
- Debugging issues
- Quick iterations

---

### 🛑 `stop_dev.sh` - Stop Development Mode

**Purpose**: Stop development containers cleanly.

**Usage**:
```bash
./stop_dev.sh
```

**What it does**:
1. Stops all development containers
2. Removes containers and networks
3. Keeps volumes intact (preserves database data)

**To remove volumes as well**:
```bash
docker compose -f docker-compose.dev.yml down -v
```

---

### 🚀 `run_prod.sh` - Production Mode

**Purpose**: Run the application in production mode with optimized builds.

**Features**:
- ✅ **Optimized Builds**: Multi-stage Docker builds for minimal image size
- ✅ **No Hot Reload**: Stable, production-ready configuration
- ✅ **Nginx Server**: Frontend served via optimized nginx
- ✅ **Detached Mode**: Runs in background
- ✅ **Clean Build**: Uses `--no-cache` for fresh builds
- ✅ **Same Dockerfile**: Uses production Dockerfile without volume mounts

**Usage**:
```bash
./run_prod.sh
```

**What it does**:
1. Cleans up existing containers and volumes
2. Builds production images from scratch (no cache)
3. Starts containers in detached mode using `docker-compose.prod.yml`
4. Shows container status and access points
5. Containers keep running in background

**Access Points**:
- Frontend: http://localhost:3000 (Nginx on port 80, mapped to 3000)
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**Management Commands**:
```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart services
docker compose -f docker-compose.prod.yml restart

# Check status
docker compose -f docker-compose.prod.yml ps
```

**Best for**:
- Production deployment
- Performance testing
- Final testing before release
- Demonstrating the application

---

### 🛑 `stop_prod.sh` - Stop Production Mode

**Purpose**: Stop production containers cleanly.

**Usage**:
```bash
./stop_prod.sh
```

**What it does**:
1. Stops all production containers
2. Removes containers and networks
3. Keeps volumes intact (preserves database data)

**To remove volumes as well**:
```bash
docker compose -f docker-compose.prod.yml down -v
```

---

### 📦 `start.sh` - Legacy Interactive Script

**Purpose**: Original script with interactive cleanup and stop.

**Features**:
- Cleans up containers and volumes
- Builds and starts in detached mode
- Waits for user input before stopping
- Good for quick demos

**Usage**:
```bash
./start.sh
```

**Note**: This script uses the old `docker-compose.yml` (now backed up as `docker-compose.yml.backup`). Consider using `run_dev.sh` or `run_prod.sh` instead.

---

## Comparison Table

| Feature | `run_dev.sh` | `run_prod.sh` | `start.sh` |
|---------|--------------|---------------|------------|
| Hot Reload | ✅ Yes | ❌ No | ❌ No |
| Source Mounted | ✅ Yes | ❌ No | ❌ No |
| Frontend Server | Vite | Nginx | Nginx |
| Backend Reload | ✅ Enabled | ❌ Disabled | ❌ Disabled |
| Container Mode | Foreground | Detached | Detached |
| Build Cache | ✅ Used | ❌ No cache | ✅ Used |
| Interactive Stop | Auto (Ctrl+C) | Manual | Prompt |
| Dockerfiles | Same (1 per service) | Same (1 per service) | Same |
| Best For | Development | Production | Quick Demo |

---

## Architecture: One Dockerfile, Multiple Compose Files

### The Simplified Approach

This project uses **one Dockerfile per service** with **different Docker Compose configurations** for dev and prod:

```
backend/
  └── Dockerfile          # Single Dockerfile for both modes

frontend/
  └── Dockerfile          # Single Dockerfile for both modes

docker-compose.dev.yml    # Development configuration
docker-compose.prod.yml   # Production configuration

.env.dev                  # Development environment variables
.env.prod                 # Production environment variables
```

### How It Works

**Development Mode** (`docker-compose.dev.yml`):
- Uses the same Dockerfile
- **Mounts source code as volumes** → hot reload
- **Overrides CMD** to add `--reload` flag
- Uses Vite dev server for frontend

**Production Mode** (`docker-compose.prod.yml`):
- Uses the same Dockerfile
- **No volume mounts** → code baked into image
- **Uses default CMD** from Dockerfile
- Uses Nginx for frontend

### Benefits

✅ **Simpler**: Only one Dockerfile to maintain per service  
✅ **DRY**: Don't repeat yourself - no duplicate Dockerfiles  
✅ **Flexible**: All differences handled via compose configuration  
✅ **Standard**: Follows Docker best practices  
✅ **Maintainable**: Changes to dependencies only need one update  

---

## Docker Compose Files

### `docker-compose.dev.yml`
Development configuration with:
- Source code mounted as volumes
- Hot reload enabled via command override
- Vite dev server for frontend
- Permissive CORS settings

**Usage**:
```bash
docker compose -f docker-compose.dev.yml up
```

### `docker-compose.prod.yml`
Production configuration with:
- No volume mounts (code in image)
- Default commands from Dockerfile
- Nginx for frontend
- Restrictive CORS settings
- Health checks enabled

**Usage**:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Environment Files

### `.env.dev`
Development environment variables:
- `DEBUG=true`
- `RELOAD=true`
- Permissive CORS origins
- Development API title

### `.env.prod`
Production environment variables:
- `DEBUG=false`
- `RELOAD=false`
- Restrictive CORS origins
- Production API title

**Note**: These files are loaded automatically by Docker Compose based on the compose file used.

---

## Dockerfiles

### `backend/Dockerfile`
Single Dockerfile for backend:
- Python 3.12 slim image
- UV package manager
- Installs dependencies
- Copies application code
- Default CMD without `--reload`

**Used by both dev and prod** - dev mode overrides CMD and mounts volumes.

### `frontend/Dockerfile`
Single Dockerfile for frontend:
- Multi-stage build
- Build stage: Node 22 with Vite
- Production stage: Nginx serving static files

**Used by both dev and prod** - dev mode uses only build stage with volume mounts.

---

## Common Workflows

### Starting Development
```bash
# Start development environment
./run_dev.sh

# Make changes to code - they'll be reflected automatically
# Press Ctrl+C when done
```

### Testing Production Build
```bash
# Build and run production version
./run_prod.sh

# Test the application
# View logs if needed
docker compose -f docker-compose.prod.yml logs -f

# Stop when done
docker compose -f docker-compose.prod.yml down
```

### Switching Between Modes
```bash
# Stop current mode
docker compose -f docker-compose.dev.yml down
# or
docker compose -f docker-compose.prod.yml down

# Start desired mode
./run_dev.sh   # or ./run_prod.sh
```

---

## Troubleshooting

### Port Already in Use
```bash
# Stop all containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.prod.yml down

# Check for running containers
docker ps

# Kill specific port (example for port 8000)
sudo lsof -ti:8000 | xargs kill -9
```

### Changes Not Reflecting (Dev Mode)
```bash
# Rebuild dev containers
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
docker compose -f docker-compose.dev.yml down -v
./run_dev.sh  # or ./run_prod.sh
```

### Frontend Not Building (Dev Mode)
The dev mode uses the `build` stage of the multi-stage Dockerfile. If you see issues:
```bash
# Check if node_modules are installed
docker compose -f docker-compose.dev.yml exec frontend ls -la /app/node_modules

# Rebuild if needed
docker compose -f docker-compose.dev.yml build --no-cache frontend
```

---

## Tips

1. **Use `run_dev.sh` for daily development** - it's faster and more convenient
2. **Use `run_prod.sh` before committing** - ensure production build works
3. **Keep containers running** - no need to restart for code changes in dev mode
4. **Check logs** - `docker compose -f docker-compose.{dev|prod}.yml logs -f [service]` for debugging
5. **Clean builds** - occasionally run with `--no-cache` to avoid cache issues
6. **One Dockerfile** - maintain only one Dockerfile per service, use compose for differences

---

## Key Differences from Previous Setup

### Before (Over-engineered)
- ❌ Multiple Dockerfiles: `Dockerfile` + `Dockerfile.dev` per service
- ❌ More files to maintain
- ❌ Duplication of build steps
- ❌ Used `-f docker-compose.yml -f docker-compose.dev.yml` (overlay approach)

### Now (Simplified)
- ✅ Single Dockerfile per service
- ✅ Separate compose files: `docker-compose.dev.yml` and `docker-compose.prod.yml`
- ✅ Environment files: `.env.dev` and `.env.prod`
- ✅ All differences handled via compose configuration
- ✅ Cleaner, more maintainable

---

**Last Updated**: 2025-12-31  
**Project**: Sapi3D v0.1.0  
**Architecture**: Single Dockerfile + Multiple Compose Files
