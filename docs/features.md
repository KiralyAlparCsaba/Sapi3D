# Features Documentation

Overview of Sapi3D features with code pointers and implementation status.

## Feature Status Legend

- ✅ **Complete** - Fully implemented and tested
- 🚧 **In Progress** - Currently being developed
- 📋 **Planned** - Designed but not yet implemented
- 💡 **Proposed** - Under consideration

## Core Features

### 1. 3D Building Visualization ✅

Interactive 3D exploration of the building using Three.js.

**Status**: Complete

**Features**:
- GLB model loading and rendering
- First-person camera controls
- Real-time 3D navigation
- Performance metrics tracking

**Code Locations**:
- Frontend: `frontend/src/components/three/ThreeScene.jsx`
- Building Model: `frontend/src/components/three/Building.jsx`
- Player Controls: `frontend/src/components/three/PlayerMovement.js`
- Metrics: `frontend/src/components/three/Metrics.js`
- 3D Models: `backend/static/models/sapi3D_V1.2.glb`

**API Endpoints**:
- `GET /model` - Download 3D model
- `GET /model/info` - Get model metadata

> **Implementation**: `backend/app/api/routers/model.py`

---

### 2. User Management 🚧

User registration, authentication, and profile management.

**Status**: In Progress (Basic CRUD complete, JWT pending)

**Features**:
- ✅ User registration with email validation
- ✅ Password hashing (bcrypt)
- ✅ User profile management
- ✅ Role-based access control (User/Admin)
- 🚧 JWT token authentication
- 📋 Password reset
- 📋 Email verification

**Code Locations**:
- Model: `backend/app/models/user.py`
  - `User` - User accounts
  - `Role` - User roles/permissions
- Schema: `backend/app/schemas/user.py`
  - `UserCreate`, `UserUpdate`, `UserResponse`
  - `UserLogin`, `Token`, `TokenData`
- Repository: `backend/app/repositories/user_repository.py`
  - `UserRepository` - User data access
  - `RoleRepository` - Role data access
- Service: `backend/app/services/user_service.py`
  - `UserService` - User business logic
- Router: `backend/app/api/routers/user_router.py`

**API Endpoints**:
- ✅ `POST /users/` - Create user
- ✅ `GET /users/` - List users (paginated)
- ✅ `GET /users/{user_id}` - Get user details
- ✅ `PUT /users/{user_id}` - Update user
- ✅ `DELETE /users/{user_id}` - Delete user
- ✅ `POST /users/login` - User login

**Database Tables**:
- `users` - User accounts and profiles
- `roles` - User roles (user, admin)

> **API Reference**: [api-reference.md](./api-reference.md#user-management)

---

### 3. Session Tracking 📋

Track user sessions and exploration activity.

**Status**: Planned (Models and schemas complete)

**Features**:
- Session start/end tracking
- Device information capture
- Session duration calculation
- Multi-device support

**Code Locations**:
- Model: `backend/app/models/session.py`
  - `Session` - User sessions
  - `Device` - Device information
- Schema: `backend/app/schemas/session.py`
  - `SessionCreate`, `SessionUpdate`, `SessionResponse`
  - `DeviceCreate`, `DeviceResponse`
- Repository: `backend/app/repositories/session_repository.py`

**Planned API Endpoints**:
- `POST /sessions` - Start new session
- `PUT /sessions/{session_id}` - End session
- `GET /sessions/{session_id}` - Get session details
- `GET /users/{user_id}/sessions` - Get user sessions

**Database Tables**:
- `sessions` - User session records
- `devices` - Device information

**Related Features**:
- Performance Metrics (tracks metrics per session)

---

### 4. Performance Metrics 📋

Real-time performance monitoring during 3D exploration.

**Status**: Planned (Models and schemas complete)

**Features**:
- FPS (frames per second) tracking
- Memory usage monitoring
- Latency measurement
- CPU/GPU usage tracking
- Performance analytics

**Code Locations**:
- Model: `backend/app/models/metrics.py`
  - `PerfMetrics` - Performance metrics
- Schema: `backend/app/schemas/metrics.py`
  - `PerfMetricsCreate`, `PerfMetricsResponse`
  - `PerfMetricsSummary` - Aggregated metrics
- Frontend: `frontend/src/components/three/Metrics.js`

**Planned API Endpoints**:
- `POST /sessions/{session_id}/metrics` - Record metrics
- `GET /sessions/{session_id}/metrics` - Get session metrics
- `GET /users/{user_id}/metrics/summary` - Get user performance summary

**Database Tables**:
- `perf_metrics` - Performance data per session

**Metrics Tracked**:
- `fps` - Frames per second
- `memory_mb` - Memory usage in MB
- `latency_ms` - Network latency in milliseconds
- `cpu_gpu_usage` - CPU/GPU utilization percentage

---

### 5. Achievement System 📋

Gamification through achievements and progress tracking.

**Status**: Planned (Models and schemas complete)

**Features**:
- Achievement definitions
- Progress tracking
- Unlock conditions
- Achievement notifications
- User achievement history

**Code Locations**:
- Model: `backend/app/models/achievement.py`
  - `Achievement` - Achievement definitions
  - `UserAchievement` - Unlocked achievements
  - `AchvProgress` - Detailed progress tracking
- Schema: `backend/app/schemas/achievement.py`
  - `AchievementCreate`, `AchievementResponse`
  - `UserAchievementCreate`, `UserAchievementResponse`
  - `AchvProgressCreate`, `AchvProgressUpdate`

**Planned API Endpoints**:
- `GET /achievements` - List all achievements
- `GET /achievements/{achv_id}` - Get achievement details
- `POST /achievements/{achv_id}/unlock` - Unlock achievement
- `PUT /achievements/{achv_id}/progress` - Update progress
- `GET /users/{user_id}/achievements` - Get user achievements

**Database Tables**:
- `achievements` - Achievement definitions
- `user_achievements` - Unlocked achievements
- `achv_progress` - Progress tracking

**Achievement Types**:
- Panel exploration (visit X info panels)
- Location discovery (visit X locations)
- Time spent (explore for X minutes)
- Distance traveled (walk X meters)

---

### 6. Location-Based Features 📋

Interactive locations with events and information panels.

**Status**: Planned (Models and schemas complete)

**Features**:
- Physical location definitions
- Location-based events
- Information panels
- Interactive hotspots
- Location history

**Code Locations**:
- Model: `backend/app/models/location.py`
  - `Location` - Physical locations
  - `Event` - Location-based events
  - `InfoPanel` - Information panels
- Schema: `backend/app/schemas/location.py`
  - `LocationCreate`, `LocationResponse`
  - `EventCreate`, `EventResponse`
  - `InfoPanelCreate`, `InfoPanelResponse`

**Planned API Endpoints**:
- `GET /locations` - List all locations
- `GET /locations/{loc_id}` - Get location details
- `GET /locations/{loc_id}/events` - Get location events
- `GET /info-panels` - List information panels
- `GET /info-panels/{panel_id}` - Get panel details

**Database Tables**:
- `locations` - Physical locations in the building
- `events` - Location-based events
- `info_panels` - Information panels

**Location Features**:
- Button locations (interactive points)
- Event triggers
- Information display
- Media content (images, videos)

---

### 7. User Interface ✅

React-based UI with navigation and controls.

**Status**: Complete (Basic UI)

**Features**:
- ✅ Navigation bar
- ✅ Sidebar menu
- ✅ Login screen (mock)
- ✅ Role-based UI (User/Admin)
- 📋 User profile page
- 📋 Admin dashboard
- 📋 Achievement display

**Code Locations**:
- Main App: `frontend/src/App.jsx`
- Navbar: `frontend/src/components/Navbar.jsx`
- Sidebar: `frontend/src/components/Sidebar.jsx`
- Styles: `frontend/src/App.css`

**UI Components**:
- Login screen with role selection
- Navigation bar (top)
- Sidebar menu (right)
- 3D scene container
- Back button for navigation

---

### 8. Health Monitoring ✅

System health checks and status monitoring.

**Status**: Complete

**Features**:
- Health check endpoint
- Service status reporting
- Version information
- Timestamp tracking

**Code Locations**:
- Router: `backend/app/api/routers/health.py`

**API Endpoints**:
- `GET /health` - System health check

---

## Feature Roadmap

### Phase 1: Foundation ✅
- [x] Database setup
- [x] Basic API structure
- [x] 3D model serving
- [x] Health monitoring

### Phase 2: User Management 🚧
- [x] User CRUD operations
- [x] Password hashing
- [ ] JWT authentication
- [ ] Email verification
- [ ] Password reset

### Phase 3: Session & Metrics 📋
- [ ] Session tracking
- [ ] Performance metrics
- [ ] Analytics dashboard

### Phase 4: Gamification 📋
- [ ] Achievement system
- [ ] Progress tracking
- [ ] Leaderboards

### Phase 5: Location Features 📋
- [ ] Location management
- [ ] Event system
- [ ] Information panels

### Phase 6: Advanced Features 💡
- [ ] Real-time multiplayer
- [ ] Voice chat
- [ ] Social features
- [ ] Mobile app

## Feature Dependencies

```
User Management
    ↓
Session Tracking
    ↓
Performance Metrics

User Management
    ↓
Achievement System
    ↓
Progress Tracking

Location Features
    ↓
Achievement System
```

## Testing Status

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|-----------|-------------------|-----------|
| 3D Visualization | ⏳ Pending | ⏳ Pending | ⏳ Pending |
| User Management | ⏳ Pending | ⏳ Pending | ⏳ Pending |
| Session Tracking | ⏳ Pending | ⏳ Pending | ⏳ Pending |
| Performance Metrics | ⏳ Pending | ⏳ Pending | ⏳ Pending |
| Achievements | ⏳ Pending | ⏳ Pending | ⏳ Pending |
| Locations | ⏳ Pending | ⏳ Pending | ⏳ Pending |

## Related Documentation

- **Architecture**: [architecture.md](./architecture.md)
- **API Reference**: [api-reference.md](./api-reference.md)
- **Database Schema**: [DATABASE_IMPLEMENTATION.md](../DATABASE_IMPLEMENTATION.md)
- **Development Guide**: [development-guide.md](./development-guide.md)

---

[← Back to Documentation Hub](./index.md)
