# Database

## Connection Details

### Docker Connection (from host)
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d
```

### Application Connection
```
postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d
```

### Credentials
- **User**: `sapi3d`
- **Password**: `sapi3d_password`
- **Database**: `sapi3d`
- **Port**: `5432`

## Database Tables (11 Total)

### Core Tables
1. **users** - User accounts and profiles
2. **roles** - User roles (admin, user, guest)
3. **user_roles** - Many-to-many relationship

### Session & Activity
4. **sessions** - User session tracking
5. **devices** - Device information per session
6. **locations** - User location tracking in 3D space

### Gamification
7. **achievements** - Achievement definitions
8. **user_achievements** - User achievement progress

### Performance
9. **metrics** - Performance metrics per session
10. **metric_snapshots** - Time-series metric data

### System
11. **system_logs** - Application logging

## Key Relationships

```
users ←→ user_roles ←→ roles
users → sessions → devices
users → sessions → locations
users → sessions → metrics → metric_snapshots
users ←→ user_achievements ←→ achievements
```

## Quick Commands

### Access Database
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d
```

### List Tables
```sql
\dt
```

### View Table Structure
```sql
\d users
\d sessions
```

### Check Connections
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'sapi3d';
```

## Detailed Documentation

→ Complete schema: `DATABASE_IMPLEMENTATION.md`
→ ERD diagram: `docs/architecture.md#database-schema`
→ Model definitions: `backend/app/models/`
