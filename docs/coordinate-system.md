# Coordinate System

This document explains how 3D coordinates work in Sapi3D: where the origin is,
which way the axes point, how the player is positioned, and the conventions that
tie the Blender model, Three.js runtime, and multiplayer network together.

---

## The simple picture (for everyone)

Think of our 3D building exactly like **Google Maps**, but you can also walk
*inside* it.

**1. One fixed reference point ("you are here" pin).**
Google Maps measures every place on Earth from a fixed system
(latitude/longitude). Our world works the same way: there's **one fixed point —
address (0, 0, 0)** — and every wall, door, and room is measured from it. The
building's designer (in Blender) decides where that "home pin" sits, and
everything else is located relative to it. Move the pin, and the whole map
shifts — so we set it once, carefully, and leave it.

**2. Three numbers instead of two.**
Google Maps needs **two** numbers to find a spot: how far **east/west** and how
far **north/south**. Indoors we add a third — **how high up** — because we also
care which **floor** you're on:

- 1st number → left ↔ right
- 2nd number → up ↕ down (which floor)
- 3rd number → forward ↔ back

So any spot in the building is just three numbers, like a street address with a
floor number.

**3. The "blue dot" is you.**
On Google Maps a blue dot shows where you stand and which way you face. In our
world you *are* that blue dot:

- Your **feet** mark your spot on the map (your address).
- Your **eyes/camera** are like the phone you hold up to look around — turning it
  changes what you *see*, but you stay on the same spot until you actually walk.

**4. "Drop a pin" to start somewhere.**
Just like sharing a Google Maps pin that drops your friend at a café entrance,
the designer places **named pins ("markers")** in the building — e.g. the main
entrance or a specific office. When you open a shared link, you're instantly
**dropped at that pin**, standing on the floor, facing the right way.

**5. Everyone sees the same map.**
Because every device measures from the *same* home pin, when a friend is at
"second floor, room 12," you both see them in the exact same place — no
translation needed. It's the same reason a Google Maps location link opens to the
identical spot on anyone's phone.

> **In one line:** It's Google Maps for the building — one fixed home point, every
> place described by a few numbers from it, and you're the blue dot walking around
> inside.

---

> **TL;DR**
> - The GLB model is placed at the world origin **untransformed**, so the
>   **GLB origin = the Three.js world origin = (0, 0, 0)**.
> - Three.js is **right-handed, Y-up**, units are **meters**.
> - The player is two nested objects: an invisible **body** (`playerRoot`, at the
>   feet) and a **camera** (the eyes, fixed `1.7 m` above the feet).
> - Movement mutates the **body** position; the camera only rotates (look).

---

## 1. The origin — there is only one that matters

In `frontend/src/components/three/Building.jsx` the loaded model is rendered as:

```jsx
<primitive object={gltf.scene} />
```

There is **no `position`, `rotation`, or `scale`** applied. This single fact is
the foundation of the whole coordinate system:

> The GLB's own origin (the `(0,0,0)` you exported from Blender) is placed
> **exactly** on the Three.js world origin `(0,0,0)`.

Consequences:

- Every coordinate in the code — spawn points, marker centers, player position,
  multiplayer positions — is expressed in this **one shared world space**.
- A mesh's **world coordinate at runtime equals its Blender coordinate** at
  export time (after the standard axis conversion in §2).
- **Whatever point you choose as the origin in Blender becomes world `(0,0,0)`**
  when walking the scene. Set it deliberately (e.g. a sensible ground-level
  reference point), because everything else is measured from it.

There is no separate "model origin" vs "scene origin" offset to track. One origin.

---

## 2. Axes and units

Three.js uses a **right-handed coordinate system with Y pointing up**. glTF
(`.glb`) uses the same convention, so the data transfers cleanly.

| Axis | Three.js (runtime) | Meaning            |
|------|--------------------|--------------------|
| X    | `+X` = right       | east / west        |
| Y    | `+Y` = **up**      | height             |
| Z    | `+Z` = toward the viewer; **`−Z` = forward (into the screen)** | depth |

### Blender Z-up → Three.js Y-up

Blender authors in a **Z-up** system, while Three.js is **Y-up**. The glTF
exporter bakes a **−90° rotation about X** into the export so the model appears
upright at runtime. As a result:

- "Up" in Blender (`+Z`) becomes "up" in Three.js (`+Y`) automatically.
- "Forward" in Blender (`+Y`) becomes "into the screen" in Three.js (`−Z`).

You do **not** manage this conversion in code — it happens at export.

### Units

Coordinates are effectively in **meters**. This is visible throughout the
movement code, e.g.:

- Eye height `playerHeight = 1.7`
- Step-up height `MAX_STEP_HEIGHT = 0.5`
- Wall collision padding `collisionDistance = 0.32`

---

## 3. The scene graph — body vs. eyes

The player is **not** a single object. It is a body with a camera parented to it.
Set up in `frontend/src/components/three/ThreeScene.jsx` (`SceneContent`):

```
scene
├── playerRoot   (THREE.Object3D)   ← the BODY / FEET, position in world space
│   └── camera   (PerspectiveCamera) ← the EYES, fixed local offset (0, 1.7, 0)
└── gltf.scene   (the GLB model: floors, walls, doors, markers, trigger zones)
```

- **`playerRoot`** — an empty `THREE.Object3D`. Its `.position` **is** the
  player's world location (at the feet, i.e. `y` = floor height). **Moving the
  player means mutating `playerRoot.position`.**
- **`camera`** — parented *inside* `playerRoot` at a **fixed local position
  `(0, 1.7, 0)`**. Because it is a child, when the body moves the camera follows
  automatically. The camera handles **looking only** (rotation via
  `PointerLockControls` on desktop, `MobilePointerLockControls` + joystick on
  mobile).

This means the camera has two positions:

- **Local** position: always `(0, 1.7, 0)` — 1.7 m above the feet.
- **World** position: `playerRoot.position + (0, 1.7, 0)` (then affected by look
  rotation). Read it with `camera.getWorldPosition(...)`.

### Feet vs. eyes — which subsystem uses which

This distinction matters when reasoning about a player's "position":

| Subsystem | Uses | Why |
|-----------|------|-----|
| Movement (`PlayerMovement.js`) | `playerRoot.position` (**feet**) | Walks the body along the floor |
| Multiplayer send (`ThreeScene.jsx`) | `playerRoot.position` (**feet**) | Remote avatars stand on the floor |
| Wall / door raycasts (`Building.jsx`, `PlayerMovement.js`) | `camera.getWorldPosition()` (**eyes**) | Rays originate from view height |
| "Inside building" trigger (`Building.jsx`) | `camera.position` (**eyes**) | Tests the head against `TriggerZone` boxes |
| Location proximity (`Building.jsx`) | `camera.getWorldPosition()` (**eyes**) | Distance from view point to marker |

---

## 4. Spawn and teleport flow

### Real spawn — marker teleport

When the GLB finishes loading, `Building` calls `onWorldReady(gltf.scene)`. In
`ThreeScene.jsx` that callback positions the player at a **marker** defined in
the model:

1. **Find the marker mesh.** A marker is selected by the `?marker=...` URL query
   param (e.g. `/app/model?marker=Foo`), matched by name; otherwise the first
   object whose name contains `marker` is used.
2. **Compute its world-space center** with a bounding box:
   `new THREE.Box3().setFromObject(markerObj)` → `box.getCenter(...)`.
3. **Set the body's X/Z** to that center: `playerRoot.position.x / .z`.
4. **Drop onto the floor:** cast a ray straight down (`Vector3(0, -1, 0)`) from
   just above the marker and set `playerRoot.position.y` to the first floor hit
   (falls back to the marker's own `y` if nothing is hit).
5. **Face a sensible direction:** copy the marker's world Y-rotation (yaw only;
   pitch/roll zeroed) onto the body.
6. Reset camera local pose to `(0, 1.7, 0)` with zero rotation.

The teleport runs once per load (guarded by `didTeleportRef`).

> The marker uses the URL query param (not React Router `location.state`) so it
> survives refresh, "open in new tab", and shared/bookmarked links.

### Fallback spawn constants

Before the marker teleport runs, two hard-coded fallback spawn points exist:

- `Building.jsx`: `SPAWN_POS = (-0.017955, -0.099324 + 1.7, 6.3213)` — a
  **camera-space** (eyes) fallback; note the `+ 1.7` eye-height offset.
- `PlayerMovement.js`: `SPAWN_POS = (1, -0.099324, 6.3213)` — a **body-space**
  (feet) target used by the fall-reset.

The `+1.7` difference between them is exactly the feet-vs-eyes offset from §3.

### Fall reset

If the body drops below world `y = -15` (`FALL_DEATH_Y` in `PlayerMovement.js`),
the player is teleported back to the body `SPAWN_POS` and velocity is zeroed.

---

## 5. Movement frame (per render frame)

Each frame, `useFrame` in `ThreeScene.jsx` calls
`player.updateMovement(delta)` from `PlayerMovement.js`. `delta` is the seconds
since the previous frame, used to keep movement frame-rate independent.

1. **Read input.** WASD / arrow keys (or the mobile joystick) build a local
   `direction` vector: `z` = forward/back, `x` = strafe.
2. **Convert to world directions.** `camera.getWorldDirection(frontDir)` gives
   the look direction; it is flattened to the ground (`frontDir.y = 0`) so
   looking up/down does not make you fly. `sideDir = frontDir × camera.up` is the
   strafe axis.
3. **Velocity + damping.** Input accelerates `velocity`; an exponential damping
   factor (`DAMPING = 5.0`) smoothly decelerates when keys are released.
4. **Horizontal collision.** Before moving, rays are cast along the intended
   direction at three heights relative to the camera
   (`HEIGHTS = [-1.2, -0.7, -0.2]`) against collidable meshes. If a wall is
   within `collisionDistance + SKIN_WALL`, the step is shortened or blocked.
   Motion is split into substeps (`MAX_SUBSTEP_DIST = 0.07`) so you cannot tunnel
   through thin walls at speed. Blocked axes slide along the wall.
5. **Gravity + floor.** A downward ray finds the floor beneath you. If hit, the
   body snaps to it (and steps up ledges up to `MAX_STEP_HEIGHT = 0.5`);
   otherwise gravity (`-30`) accelerates the body downward.

Collidable meshes are everything in the GLB **except** `Roof` and `TriggerZone*`
(rebuilt lazily via `rebuildCollidablesIfNeeded`).

---

## 6. Multiplayer position convention

In `ThreeScene.jsx`, each frame (multiplayer only) the local player broadcasts:

```js
camera.getWorldDirection(fwd);
const rotY = Math.atan2(fwd.x, fwd.z);
sendPosition(playerRootRef.current.position, rotY);
```

- **Position sent** = `playerRoot.position` — the **feet**, in world space.
- **Rotation sent** = `rotY = atan2(fwd.x, fwd.z)` — yaw about the Y axis.
  `rotY = 0` means facing `+Z`; the value increases toward `+X`.

Throttling (`useMultiplayer.js`): positions are sent at most every
`SEND_INTERVAL_MS = 100` ms, and only when moved beyond `MIN_DELTA_POS = 0.02` m
or `MIN_DELTA_ROT = 0.02` rad (with a ~2 s heartbeat otherwise).

**Remote players** (`RemotePlayer.jsx`) place their `group` at the received
`(x, y, z)` in world space and set `rotation.y = rotY`, interpolating
(`LERP_RATE = 12`) toward the latest target for smooth motion. The nametag sits
at local `(0, 2.05, 0)` above the avatar.

Because all clients share the same untransformed world origin (§1), a position
sent by one client lands at the correct place on every other client with no
remapping.

---

## 7. Blender authoring conventions

A lot of behavior is keyed off **object names** set in Blender and discovered
during `gltf.scene.traverse()` in `Building.jsx`. Because the model is
untransformed, each object's world coordinates equal its Blender coordinates.

| Name pattern | Purpose |
|--------------|---------|
| `marker*` | Spawn/teleport targets (§4), hologram info panels, and location-visit proximity triggers. Center taken via `Box3`. Made invisible at runtime. |
| `TriggerZone*` | Invisible `Box3` volumes. When the camera enters one, `Roof` is hidden and `Interior` is shown ("inside the building"). Excluded from collision. |
| `COL*` | Collision-only meshes — made invisible but still block movement. |
| `*door*` | Interactive doors (raycast from screen center detects when you look at one within `MAX_DISTANCE = 3` m). |
| `Roof` | Hidden when inside a trigger zone. Excluded from collision. |
| `Interior` | Shown when inside a trigger zone. |

**Authoring guidance:**

- Decide your **origin** deliberately in Blender — it becomes world `(0,0,0)`.
- Keep the model **Y-forward / Z-up authoring** as usual; let the glTF exporter
  handle the Y-up conversion (§2). Do not pre-rotate to "fix" it.
- Place `marker` empties/meshes where you want players to spawn and face; their
  yaw is used for the spawn facing direction.
- Use `COL*` for invisible collision geometry and `TriggerZone*` boxes to drive
  the roof/interior swap.

---

## 8. Code reference

| Concept | File | Notes |
|---------|------|-------|
| Model placed at origin (untransformed) | `frontend/src/components/three/Building.jsx` | `<primitive object={gltf.scene} />` |
| Scene graph (body + camera) | `frontend/src/components/three/ThreeScene.jsx` | `scene.add(playerRoot)`, `playerRoot.add(camera)`, `camera.position.set(0, 1.7, 0)` |
| Canvas camera defaults | `frontend/src/components/three/ThreeScene.jsx` | `camera={{ position: [0, 1.7, 0], fov: 75 }}` |
| Marker teleport / floor drop | `frontend/src/components/three/ThreeScene.jsx` | `onWorldReady` callback |
| Movement, collision, gravity | `frontend/src/components/three/PlayerMovement.js` | `updateMovement(delta)` |
| Fallback spawns / fall reset | `Building.jsx`, `PlayerMovement.js` | `SPAWN_POS`, `FALL_DEATH_Y = -15` |
| Name-based anchors | `frontend/src/components/three/Building.jsx` | `traverse()` over `marker`, `COL`, `TriggerZone`, `door`, `Roof`, `Interior` |
| Multiplayer send convention | `frontend/src/components/three/ThreeScene.jsx` | feet position + `rotY = atan2(fwd.x, fwd.z)` |
| Multiplayer throttling | `frontend/src/components/three/useMultiplayer.js` | `SEND_INTERVAL_MS`, `MIN_DELTA_POS`, `MIN_DELTA_ROT` |
| Remote player placement / lerp | `frontend/src/components/three/RemotePlayer.jsx` | world `(x,y,z)`, `rotation.y`, `LERP_RATE = 12` |

---

## 9. Glossary

- **World origin** — `(0,0,0)` in Three.js; identical to the GLB/Blender origin.
- **Body / feet** — `playerRoot`, the object whose world position is the player's
  ground location.
- **Eyes** — the camera, fixed `1.7 m` above the feet; used for raycasts and
  proximity tests.
- **Yaw (`rotY`)** — rotation about the vertical (Y) axis; the only rotation
  shared over the network.
- **Marker** — a named object in the GLB used as a spawn/teleport point and POI.
- **Collidable** — any GLB mesh that blocks movement (everything except `Roof`
  and `TriggerZone*`).
