# Sapi3D Avatars (3D)

This folder holds the multiplayer avatar GLB files plus the `manifest.json`
that describes them. Files here are served via the StaticFiles mount at
`/static/avatars-3d/` and listed via `GET /avatars/manifest`.

> Note: this is **separate** from `backend/static/avatars/`, which holds the
> user profile picture uploads — a different concern entirely.

---

## Adding an avatar

1. Export the avatar from Blender as a `.glb` (binary glTF), following the
   conventions below.
2. Optionally export a square thumbnail PNG (e.g. 256×256) showing the
   front of the avatar.
3. Drop both files into this folder.
4. Add an entry to `manifest.json` (schema below).
5. Restart the backend container.

The frontend's avatar manifest is fetched from `GET /api/avatars/manifest`
on first use and cached in memory. A backend restart picks up the new
entry; in dev, you can also call `reload_manifest()` from
`avatars_router.py` if you wire it to a future admin endpoint.

---

## Conventions for the GLB

Follow these and the avatar drops in without code changes.

### File format

- Binary glTF 2.0 (`.glb`). Embed textures inside the file (no external
  texture refs).

### Geometry

- **Scale:** real-world meters. A typical humanoid should be roughly 1.7m
  tall when imported.
- **Origin / pivot:** at the feet, on the ground plane (y = 0). The world
  position broadcast over multiplayer is the *feet* position.
- **Forward axis:** the avatar's local **+Z** should be the direction it's
  facing at rest. This matches the player root used by the existing
  simulation in `PlayerMovement.js`.
- **Triangle budget:** under ~15 000 triangles per avatar is comfortable
  at 50 concurrent players. Lower is better; the `metricsCollector`
  pipeline will tell you the exact FPS impact.

### Materials & textures

- Prefer a single material per avatar. PBR via `MeshStandardMaterial` is
  the default.
- Keep texture sizes ≤ 1024 × 1024. Higher quickly eats VRAM at 50
  concurrent avatars.

### Bones / rig

The look-at-nearest-player feature expects these bone names by default:

- `head` — rotated to point the head toward the look-at target.
- `eye_L` — rotated to aim the left eye.
- `eye_R` — rotated to aim the right eye.

If your rig uses different names (Blender's `.L`/`.R` convention is
common — e.g. `Head`, `Eye.L`, `Eye.R`), override them in the manifest
entry's `bones` block rather than renaming bones inside Blender.

A minimum rig of just these bones plus a root works fine; you don't
need a full body skeleton unless you also want body animation. An
eyes-only rig (no `head` bone) is also valid — body won't track,
only the eyes will.

#### Bone forward axis

Each bone has a local "forward" axis — the direction it visually points
in at rest. The default is **bone-local +Y**, which matches Blender's
standard convention (a bone's local +Y is its head→tail direction).
This is what you get from any normal Blender glTF export, so most rigs
work without configuration.

For rigs that use a different convention, set `bones.forwardAxis` on
the variant in `manifest.json`. Accepted values: `+X`, `-X`, `+Y`,
`-Y`, `+Z`, `-Z`. All look-at bones in a variant share the same forward
axis — mixing conventions within one rig isn't supported.

### Animations (optional but recommended)

Embed at least an `idle` clip if you want any motion. The frontend looks
for a clip whose name contains "idle" (case-insensitive) and plays it on
loop with a randomized phase offset, so 50 avatars aren't moving in
lockstep. Additional clips named `walk` / `run` are reserved for future
use when the multiplayer protocol gains a movement state field.

### Morph targets (alternative for eye motion)

If eye motion is authored as Blender shape keys instead of bones, name
them `eye_look_x` (range -1 left to +1 right) and `eye_look_y` (range -1
down to +1 up). The frontend will drive these as morph influences. **Bone
rotation takes precedence** if both bones and morph targets exist on the
same avatar.

---

## `manifest.json` schema

```json
{
  "variants": [
    {
      "id": "student_male",
      "name": "Student (Male)",
      "gltfUrl": "/api/static/avatars-3d/student_male.glb",
      "thumbnail": "/api/static/avatars-3d/student_male.png",
      "bones": {
        "head": "Head",
        "eyeL": "Eye.L",
        "eyeR": "Eye.R",
        "forwardAxis": "+Y"
      }
    }
  ]
}
```

### Field reference

- `id` (required, string) — stable identifier. **Must not change across
  deployments** once users can pick variants in a future selector,
  because the chosen `id` will be persisted in the database.
- `name` (required, string) — display name shown in any future picker UI.
- `gltfUrl` (required, string) — absolute URL the frontend uses to fetch
  the GLB. Conventionally `/api/static/avatars-3d/<file>.glb`.
- `thumbnail` (optional, string) — absolute URL to a preview image. Used
  by the future avatar picker; safe to omit for now.
- `bones` (optional, object) — name overrides for the look-at bones. Omit
  entirely if your rig follows the defaults (`head`, `eye_L`, `eye_R`).

### Why `/api/` is in the URL

The frontend talks to the backend through nginx at `/api/...`. The
StaticFiles mount serves the GLB at `/static/avatars-3d/...` on the
FastAPI side; nginx rewrites `/api/*` to that path. Putting the
`/api/` prefix in the manifest means the value can be passed directly to
`useGLTF()` and `<img src>` without any client-side rewriting.

---

## Where the rendering code lives

- Frontend GLB renderer: `frontend/src/components/three/avatars/AvatarGLTF.jsx`
- Frontend fallback (capsule): `frontend/src/components/three/avatars/AvatarFallback.jsx`
- Frontend manifest fetcher: `frontend/src/components/three/avatars/avatarManifest.js`
- Backend manifest endpoint: `GET /avatars/manifest` (defined in `app/api/routers/avatars_router.py`)
- Backend StaticFiles mount: `/static/avatars-3d/` (configured in `app/main.py`)

## Empty-manifest behavior

With an empty `variants` array, the backend endpoint returns `[]`, the
frontend's `getAvatarForUserId(...)` returns `null` for every userId, and
`<Avatar>` falls back to `<AvatarFallback>` — the capsule placeholder
that's already in use. This is the current safe state; nothing breaks
when no GLBs are present.
