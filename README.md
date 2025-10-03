# Sapi3D

A modern 3D building visualization application with interactive first-person exploration, built with FastAPI and React.

## Quick Start
```bash
./start.sh
```
This script will clean up containers, build, run, and allow you to stop them with any key press.

Then open your browser to `http://localhost:3000`

## Features

- **Role-based Authentication** - Login as User or Admin
- **3D Building Exploration** - First-person navigation with mouse and keyboard
- **Interior/Exterior Views** - Automatic roof hiding when entering the building
- **Performance Monitoring** - Real-time FPS and render metrics
- **Responsive Design** - Clean UI with navigation sidebar
- **RESTful API** - FastAPI backend with automatic OpenAPI/Swagger documentation
- **Fast Dependencies** - UV package manager for lightning-fast builds
- **Docker Support** - Containerized application with proper service orchestration

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
- `GET /model/info` - Get detailed model metadata (file size, version, etc.)

### API Response Example
```json
{
  "filename": "sapi3D_V1.2.glb",
  "file_size": 1234567,
  "content_type": "model/gltf-binary",
  "model_version": "1.2",
  "last_modified": "2023-10-03T17:37:09.123456",
  "file_path": "static/models/sapi3D_V1.2.glb"
}
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework with automatic API documentation
- **UV** - Ultra-fast Python package manager (10x faster than pip)
- **Pydantic** - Data validation using Python type hints
- **Uvicorn** - Lightning-fast ASGI server

### Frontend
- **React 19** - Latest React with concurrent features
- **Three.js** - 3D graphics library
- **@react-three/fiber** - React Three.js renderer
- **@react-three/drei** - Three.js helpers and abstractions
- **Vite** - Next-generation frontend build tool

### Infrastructure
- **Docker** - Containerized deployment
- **Docker Compose** - Multi-service orchestration
- **CORS** - Cross-origin resource sharing enabled

## Development

### Project Structure
```
Sapi3D/
├── backend/
│   ├── app/
│   │   ├── api/routers/     # API route handlers
│   │   ├── core/           # Configuration and logging
│   │   ├── schemas/        # Pydantic data models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── static/models/      # 3D model files
│   ├── tests/              # API tests
│   ├── docs/              # Documentation
│   └── Dockerfile         # Backend container config
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   └── assets/         # Static assets
│   └── Dockerfile         # Frontend container config
├── docker-compose.yml     # Service orchestration
└── start.sh              # Quick start script
```

### Manual Setup
1. **Backend**: `cd backend && uv pip install -r pyproject.toml`
2. **Frontend**: `cd frontend && npm install`
3. **Run Backend**: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
4. **Run Frontend**: `npm run dev`

## Architecture

The application follows a clean, modern architecture:

- **API-First Design**: RESTful API with OpenAPI specification
- **Microservices**: Separate backend and frontend services
- **Type Safety**: Full TypeScript/Python type checking
- **Performance**: Optimized for fast loading and smooth 3D rendering
- **Scalability**: Docker-based deployment ready for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `./start.sh`
5. Submit a pull request

## License

This project is licensed under the MIT License.
