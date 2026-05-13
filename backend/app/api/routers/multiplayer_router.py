"""
Multiplayer WebSocket router.

Single endpoint: /ws/world

Auth: JWT token passed as ?token=... in the connect URL.

Protocol (JSON over WS):
  Client -> Server:
    { "type": "position", "x": ..., "y": ..., "z": ..., "rotY": ... }
    { "type": "ping" }

  Server -> Client:
    { "type": "welcome",       "self": {...},   "others": [...] }
    { "type": "user_joined",   "user": {...} }
    { "type": "user_left",     "userId": ... }
    { "type": "position",      "userId": ..., "x":..., "y":..., "z":..., "rotY":... }
    { "type": "pong" }
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.security import decode_access_token
from repositories.user_repository import UserRepository
from services.presence_service import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter()


async def _resolve_user_from_token(token: str):
    """Decode token, fetch user from DB. Returns (user_id, username, avatar_url) or None."""
    try:
        payload = decode_access_token(token)
    except Exception as e:
        logger.warning(f"[MP] Token decode failed: {e}")
        return None

    username = payload.get("username")
    if not username:
        return None

    async with AsyncSessionLocal() as db:  # type: AsyncSession
        repo = UserRepository(db)
        user = await repo.get_by_username(username)
        if user is None:
            return None
        return (user.user_id, user.username, user.avatar_url)


@router.websocket("/ws/world")
async def world_ws(websocket: WebSocket, token: str = Query(...)):
    """Main multiplayer presence WebSocket."""
    # Authenticate BEFORE accepting (cleaner reject) - but FastAPI requires accept first for close.
    await websocket.accept()

    resolved = await _resolve_user_from_token(token)
    if resolved is None:
        await websocket.send_json({"type": "error", "reason": "auth_failed"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id, username, avatar_url = resolved

    state = await connection_manager.connect(websocket, user_id, username, avatar_url)

    try:
        # Send welcome with current world snapshot. `get_others` already
        # excludes players who haven't sent their first position yet — those
        # are "invisible" and shouldn't show up as fake (0,0,0) capsules.
        await websocket.send_json({
            "type": "welcome",
            "self": state.public_dict(),
            "others": connection_manager.get_others(user_id),
        })

        # NOTE: we DON'T broadcast user_joined here. We wait until the client
        # sends its first real position — then we announce them to others
        # with correct coordinates so nobody ever sees them at (0,0,0).

        # Message loop
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # Per-user inbound rate limit. Drops messages above the threshold
            # silently — a well-behaved client will never hit this, but a
            # buggy or hostile one can't flood the server.
            if not connection_manager.check_rate_limit(user_id):
                continue

            if msg_type == "position":
                try:
                    x = float(data.get("x", 0.0))
                    y = float(data.get("y", 0.0))
                    z = float(data.get("z", 0.0))
                    rot_y = float(data.get("rotY", 0.0))
                except (TypeError, ValueError):
                    continue

                first_position = connection_manager.update_position(
                    user_id, x, y, z, rot_y
                )

                if first_position:
                    # This is the user's first real position. Tell everyone
                    # else they joined — *with* correct coordinates.
                    player = connection_manager.get_player(user_id)
                    if player is not None:
                        await connection_manager.broadcast(
                            {"type": "user_joined", "user": player.public_dict()},
                            exclude_user_id=user_id,
                        )
                else:
                    # Routine position update.
                    await connection_manager.broadcast(
                        {
                            "type": "position",
                            "userId": user_id,
                            "x": x, "y": y, "z": z, "rotY": rot_y,
                        },
                        exclude_user_id=user_id,
                    )

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            # Other message types ignored for now (chat comes later)

    except WebSocketDisconnect:
        logger.info(f"[MP] User {user_id} ({username}) disconnected normally")
    except Exception as e:
        logger.exception(f"[MP] Unexpected error for user {user_id}: {e}")
    finally:
        # Only remove from manager + broadcast departure if THIS websocket is
        # still the registered one (i.e. this isn't a stale duplicate that was
        # already replaced by a newer connection). Also only announce departure
        # if the user was ever visible (had_position) — otherwise nobody ever
        # received a user_joined for them.
        removed, was_visible = await connection_manager.disconnect(user_id, websocket)
        if removed and was_visible:
            await connection_manager.broadcast(
                {"type": "user_left", "userId": user_id},
            )
