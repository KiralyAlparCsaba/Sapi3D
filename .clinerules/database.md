# Database

## Connection Details

- **URL**: `postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d`
- **Driver**: asyncpg (async PostgreSQL driver)
- **ORM**: SQLAlchemy 2.0 with async support
- **Connection Pool**: 5 base + 10 overflow connections

## Database Tables (11 Total)

1. **users** - User accounts & profiles
2. **roles** - User roles/permissions (user, admin)
3. **sessions** - User session tracking
4. **devices** - Device information
5. **achievements** - Achievement definitions
6. **user_achievements** - Unlocked achievements
7. **achv_progress** - Achievement progress tracking
8. **locations** - Physical locations in building
9. **events** - Location-based events
10. **info_panels** - Information panels
11. **perf_metrics** - Performance metrics per session

## Key Relationships

```
User ←→ Role (many-to-one)
User ←→ Sessions (one-to-many)
User ←→ UserAchievements (one-to-many)
User ←→ AchvProgress (one-to-many)

Session ←→ Device (many-to-one)
Session ←→ PerfMetrics (one-to-many)

Achievement ←→ UserAchievements (one-to-many)
Achievement ←→ AchvProgress (one-to-many)

Location ←→ Events (one-to-many)
```

## Quick Commands

### Connect to Database
```bash
docker exec -it sapi3d-db psql -U sapi3d -d sapi3d
```

### Common Queries
```sql
\dt              # List all tables
\d users         # Describe users table
SELECT * FROM users;
```

## Documentation Pointers

→ Complete database schema: `DATABASE_IMPLEMENTATION.md`
→ ERD diagram: `docs/architecture.md#database-schema`
→ Usage examples: `DATABASE_IMPLEMENTATION.md#usage-example`
→ All models: `backend/app/models/`
→ All schemas: `backend/app/schemas/`
