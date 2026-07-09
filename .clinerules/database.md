# Database

PostgreSQL 16 accessed via SQLAlchemy 2.0 (async). **16 tables** defined in
`backend/app/models/`. This file is a schema quick-reference: tables, key
properties, and foreign keys. For connection/access, use the Docker rules in
`common_tasks.md` or the database MCP.

Legend: **PK** = primary key, `col → table.col` = foreign key, `(CASCADE)` = ON DELETE CASCADE.

## Users & Roles

### roles
- **role_id** (PK), role_name (unique)

### users
- **user_id** (PK), username (unique), email (unique), pasw_hash, avatar_url
- role_id → roles.role_id
- created_at, updated_at (timestamps)

## Sessions & Devices

### devices
- **device_id** (PK), device_type, browser, browser_version, os_name

### sessions
- **session_id** (PK), started_at, ended_at, device_type, app_version
- user_id → users.user_id (CASCADE)
- device_id → devices.device_id (nullable)

### guest_logins
- **id** (PK), logged_at — one row per issued guest token (standalone)

## Gamification

### achievements
- **achv_id** (PK), name, description

### user_achievements
- **id** (PK), unlocked_at
- user_id → users.user_id
- achv_id → achievements.achv_id

### achv_progress
- **id** (PK), model_view_count, time_spent (s), distance_walked (m), session_start
- user_id → users.user_id
- achv_id → achievements.achv_id

### achv_progress_panels
- **id** (PK)
- progress_id → achv_progress.id
- panel_id → info_panels.panel_id

### achv_progress_locations
- **id** (PK)
- progress_id → achv_progress.id
- location_id → locations.loc_id

### achievement_requirements
- **id** (PK), req_type, value, requirement_data (JSON)
- achv_id → achievements.achv_id
- location_id → locations.loc_id (nullable)
- panel_id → info_panels.panel_id (nullable)

## Locations & Content

### locations
- **loc_id** (PK), name, button_location, information, image_path

### events
- **event_id** (PK), name, description, image_path, event_date
- loc_id → locations.loc_id

### info_panels
- **panel_id** (PK), information, coordinates_obj_name, media_url

## Performance

### perf_metrics
- **metrics_id** (PK), timestamp, fps, memory_mb, latency_ms, samples (JSONB),
  load_time_s, peak_memory_mb, quality_reductions, play_mode
- session_id → sessions.session_id (CASCADE)

## Chat

### chat_messages
- **msg_id** (PK, BigInteger), text, sent_at
- from_user_id → users.user_id (CASCADE)
- to_user_id → users.user_id (CASCADE)
- Indexes: (from_user_id, to_user_id, sent_at), (to_user_id, from_user_id, sent_at)

## Relationship Summary

```
roles → users → sessions → perf_metrics
devices → sessions
users → user_achievements → achievements
users → achv_progress → achievements
achv_progress → achv_progress_panels → info_panels
achv_progress → achv_progress_locations → locations
achievements → achievement_requirements → (locations, info_panels)
locations → events
users → chat_messages → users
guest_logins (standalone)
```

## Detailed Documentation

→ Full column-level schema: `docs/database.md`
→ ERD diagram: `docs/architecture.md#database-schema`
→ Model definitions: `backend/app/models/`
