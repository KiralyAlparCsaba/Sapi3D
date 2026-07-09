# Database Schema

Complete reference for the Sapi3D database, generated from the SQLAlchemy models
in `backend/app/models/`.

> **Connection commands & credentials**: See [.clinerules/database.md](../.clinerules/database.md)  
> **Visual ERD**: See [architecture.md](./architecture.md#database-schema)

## Overview

- **Engine**: PostgreSQL 16 (Alpine)
- **ORM**: SQLAlchemy 2.0 (async, `Mapped[]` type hints)
- **Driver**: `asyncpg`
- **Connection URL**: `postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d`
- **Tables**: 16 (across 6 model files)

Tables are auto-created on startup via `init_db()` (see `backend/app/core/database.py`).

## Conventions

- **Primary keys**: `Integer`, autoincrement (except `chat_messages.msg_id` which is `BigInteger`).
- **Timestamps**: The `TimestampMixin` (`backend/app/models/base.py`) adds
  `created_at` and `updated_at` (`timezone=True`, server default `now()`).
  Only the `users` table currently uses this mixin.
- **JSON columns**: `perf_metrics.samples` (JSONB), `achievement_requirements.requirement_data` (JSON).
- **Cascades**: Several relationships use `cascade="all, delete-orphan"` and/or
  `ondelete="CASCADE"` — noted per table below.

---

## Users & Roles

### `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| `role_id` | Integer | PK, autoincrement |
| `role_name` | String(50) | unique, not null |

### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | Integer | PK, autoincrement |
| `username` | String(50) | unique, not null, indexed |
| `pasw_hash` | String(255) | not null |
| `email` | String(255) | unique, not null, indexed |
| `avatar_url` | String(500) | nullable |
| `role_id` | Integer | FK → `roles.role_id`, not null |
| `created_at` | DateTime(tz) | not null, default `now()` |
| `updated_at` | DateTime(tz) | not null, default `now()`, on update `now()` |

**Relationships**: `role` (many-to-one); `sessions`, `user_achievements`,
`achievement_progress` (one-to-many, delete-orphan).

---

## Sessions & Devices

### `devices`
| Column | Type | Constraints |
|--------|------|-------------|
| `device_id` | Integer | PK, autoincrement |
| `device_type` | String(50) | not null |
| `browser` | String(100) | not null |
| `browser_version` | String(50) | nullable |
| `os_name` | String(100) | not null |

### `sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| `session_id` | Integer | PK, autoincrement |
| `user_id` | Integer | FK → `users.user_id` (ON DELETE CASCADE), not null, indexed |
| `device_id` | Integer | FK → `devices.device_id`, nullable |
| `started_at` | DateTime(tz) | not null |
| `ended_at` | DateTime(tz) | nullable |
| `device_type` | String(50) | nullable |
| `app_version` | String(20) | nullable |

**Relationships**: `user`, `device` (many-to-one); `perf_metrics` (one-to-many, delete-orphan).

### `guest_logins`
Lightweight record inserted each time a guest token is issued.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `logged_at` | DateTime(tz) | not null |

---

## Achievements

### `achievements`
| Column | Type | Constraints |
|--------|------|-------------|
| `achv_id` | Integer | PK, autoincrement |
| `name` | String(100) | not null |
| `description` | String(500) | not null |

**Relationships**: `user_achievements`, `achievement_progress` (one-to-many, delete-orphan).

### `user_achievements`
Tracks unlocked achievements per user.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `user_id` | Integer | FK → `users.user_id`, not null, indexed |
| `achv_id` | Integer | FK → `achievements.achv_id`, not null, indexed |
| `unlocked_at` | DateTime(tz) | not null |

### `achv_progress`
Detailed progress toward an achievement.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `user_id` | Integer | FK → `users.user_id`, not null, indexed |
| `achv_id` | Integer | FK → `achievements.achv_id`, not null, indexed |
| `model_view_count` | BigInteger | not null, default 0 |
| `time_spent` | BigInteger | not null, default 0 (seconds) |
| `distance_walked` | BigInteger | not null, default 0 (meters) |
| `session_start` | DateTime(tz) | nullable (model open time) |

**Relationships**: `panels`, `locations` (one-to-many, delete-orphan).

### `achv_progress_panels`
Which info panels were viewed within an achievement's progress.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `progress_id` | Integer | FK → `achv_progress.id`, not null, indexed |
| `panel_id` | Integer | FK → `info_panels.panel_id`, not null, indexed |

### `achv_progress_locations`
Which locations were visited within an achievement's progress.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `progress_id` | Integer | FK → `achv_progress.id`, not null, indexed |
| `location_id` | Integer | FK → `locations.loc_id`, not null, indexed |

### `achievement_requirements`
Conditions that define how an achievement is unlocked.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | PK, autoincrement |
| `achv_id` | Integer | FK → `achievements.achv_id`, not null, indexed |
| `req_type` | String(50) | not null (e.g. `model_view_count`, `location_count`, `panel_count`, `time_spent`, `location`, `panel`, `location_any_of`, `panel_any_of`) |
| `value` | Integer | nullable (numeric threshold) |
| `location_id` | Integer | FK → `locations.loc_id`, nullable, indexed |
| `panel_id` | Integer | FK → `info_panels.panel_id`, nullable, indexed |
| `requirement_data` | JSON | nullable (flexible data, e.g. `location_ids`, `panel_ids`) |

---

## Locations & Content

### `locations`
| Column | Type | Constraints |
|--------|------|-------------|
| `loc_id` | Integer | PK, autoincrement |
| `name` | String(100) | not null |
| `button_location` | String(200) | not null |
| `information` | String(1000) | not null |
| `image_path` | String(500) | nullable |

**Relationships**: `events` (one-to-many, delete-orphan).

### `events`
| Column | Type | Constraints |
|--------|------|-------------|
| `event_id` | Integer | PK, autoincrement |
| `name` | String(100) | not null |
| `description` | String(1000) | not null |
| `image_path` | String(500) | nullable |
| `event_date` | Date | nullable |
| `loc_id` | Integer | FK → `locations.loc_id`, not null, indexed |

### `info_panels`
| Column | Type | Constraints |
|--------|------|-------------|
| `panel_id` | Integer | PK, autoincrement |
| `information` | Text | not null |
| `coordinates_obj_name` | String(200) | not null |
| `media_url` | String(500) | nullable |

---

## Metrics

### `perf_metrics`
Performance samples recorded per session.

| Column | Type | Constraints |
|--------|------|-------------|
| `metrics_id` | Integer | PK, autoincrement |
| `session_id` | Integer | FK → `sessions.session_id` (ON DELETE CASCADE), not null, indexed |
| `timestamp` | DateTime(tz) | not null |
| `fps` | Integer | not null |
| `memory_mb` | Integer | not null |
| `latency_ms` | BigInteger | not null |
| `samples` | JSONB | nullable |
| `load_time_s` | Float | nullable |
| `peak_memory_mb` | Float | nullable |
| `quality_reductions` | Integer | nullable |
| `play_mode` | String(10) | nullable |

---

## Chat

### `chat_messages`
Direct messages between users.

| Column | Type | Constraints |
|--------|------|-------------|
| `msg_id` | BigInteger | PK, autoincrement |
| `from_user_id` | Integer | FK → `users.user_id` (ON DELETE CASCADE), not null |
| `to_user_id` | Integer | FK → `users.user_id` (ON DELETE CASCADE), not null |
| `text` | Text | not null |
| `sent_at` | DateTime(tz) | not null, server default `now()` |

**Indexes**:
- `ix_chat_from_to_sent` (`from_user_id`, `to_user_id`, `sent_at`)
- `ix_chat_to_from_sent` (`to_user_id`, `from_user_id`, `sent_at`)

---

## Relationship Summary

```
roles ──< users
users ──< sessions ──< perf_metrics
devices ──< sessions
users ──< user_achievements >── achievements
users ──< achv_progress >── achievements
achv_progress ──< achv_progress_panels >── info_panels
achv_progress ──< achv_progress_locations >── locations
achievements ──< achievement_requirements >── (locations, info_panels)
locations ──< events
users ──< chat_messages >── users   (from_user_id / to_user_id)
guest_logins                        (standalone)
```

## Related Documentation

- **Model definitions**: `backend/app/models/`
- **Connection & quick commands**: [.clinerules/database.md](../.clinerules/database.md)
- **Visual ERD & architecture**: [architecture.md](./architecture.md#database-schema)
- **API reference**: [api-reference.md](./api-reference.md)

---

[← Back to Documentation Hub](./index.md)
