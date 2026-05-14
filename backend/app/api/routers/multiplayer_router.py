from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.security import decode_access_token
from repositories.user_repository import UserRepository
from repositories.chat_repository import ChatRepository
from services.presence_service import connection_manager

MAX_CHAT_TEXT_LEN = 500
CHAT_HISTORY_LIMIT = 50

logger = logging.getLogger(__name__)

router = APIRouter()


async def _resolve_user_from_token(token: str):
    try:
        payload = decode_access_token(token)
    except Exception as e:
        logger.warning(f"[MP] Token decode failed: {e}")
        return None

    username = payload.get("username")
    if not username:
        return None

    async with AsyncSessionLocal() as db:
        repo = UserRepository(db)
        user = await repo.get_by_username(username)
        if user is None:
            return None
        return (user.user_id, user.username, user.avatar_url)


@router.websocket("/ws/world")
async def world_ws(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()

    resolved = await _resolve_user_from_token(token)
    if resolved is None:
        await websocket.send_json({"type": "error", "reason": "auth_failed"})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id, username, avatar_url = resolved

    state = await connection_manager.connect(websocket, user_id, username, avatar_url)

    try:
        await websocket.send_json({
            "type": "welcome",
            "self": state.public_dict(),
            "others": connection_manager.get_others(user_id),
        })
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
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
                    player = connection_manager.get_player(user_id)
                    if player is not None:
                        await connection_manager.broadcast(
                            {"type": "user_joined", "user": player.public_dict()},
                            exclude_user_id=user_id,
                        )
                else:
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

            elif msg_type == "chat_send":
                await _handle_chat_send(user_id, username, data, websocket)

            elif msg_type == "chat_history":
                await _handle_chat_history(user_id, data, websocket)

    except WebSocketDisconnect:
        logger.info(f"[MP] User {user_id} ({username}) disconnected normally")
    except Exception as e:
        logger.exception(f"[MP] Unexpected error for user {user_id}: {e}")
    finally:
        removed, was_visible = await connection_manager.disconnect(user_id, websocket)
        if removed and was_visible:
            await connection_manager.broadcast(
                {"type": "user_left", "userId": user_id},
            )

def _chat_message_dict(msg, from_username: str) -> dict:
    return {
        "msgId": msg.msg_id,
        "fromUserId": msg.from_user_id,
        "toUserId": msg.to_user_id,
        "fromUsername": from_username,
        "text": msg.text,
        "sentAt": msg.sent_at.isoformat() if msg.sent_at else None,
    }


async def _handle_chat_send(
    user_id: int,
    username: str,
    data: dict,
    websocket: WebSocket,
) -> None:
    to_user_id = data.get("to")
    text = data.get("text")
    if not isinstance(to_user_id, int):
        await websocket.send_json(
            {"type": "chat_error", "reason": "missing_recipient"}
        )
        return
    if to_user_id == user_id:
        await websocket.send_json(
            {"type": "chat_error", "reason": "cant_message_self"}
        )
        return
    if not isinstance(text, str):
        await websocket.send_json(
            {"type": "chat_error", "reason": "missing_text"}
        )
        return
    text = text.strip()
    if not text:
        await websocket.send_json(
            {"type": "chat_error", "reason": "empty_text"}
        )
        return
    if len(text) > MAX_CHAT_TEXT_LEN:
        await websocket.send_json(
            {"type": "chat_error", "reason": "text_too_long"}
        )
        return
    async with AsyncSessionLocal() as db:
        chat_repo = ChatRepository(db)
        user_repo = UserRepository(db)
        recipient = await user_repo.get_by_id(to_user_id)
        if recipient is None:
            await websocket.send_json(
                {"type": "chat_error", "reason": "unknown_recipient"}
            )
            return

        try:
            msg = await chat_repo.save_message(user_id, to_user_id, text)
            await db.commit()
        except Exception as e:
            logger.exception(f"[MP] Failed to save chat message: {e}")
            await db.rollback()
            await websocket.send_json(
                {"type": "chat_error", "reason": "save_failed"}
            )
            return

    payload = {"type": "chat_message", **_chat_message_dict(msg, username)}
    await connection_manager.send_to(user_id, payload)
    await connection_manager.send_to(to_user_id, payload)


async def _handle_chat_history(
    user_id: int,
    data: dict,
    websocket: WebSocket,
) -> None:
    with_user_id = data.get("with")
    if not isinstance(with_user_id, int) or with_user_id == user_id:
        await websocket.send_json(
            {"type": "chat_error", "reason": "bad_history_target"}
        )
        return

    async with AsyncSessionLocal() as db:
        chat_repo = ChatRepository(db)
        user_repo = UserRepository(db)
        rows = await chat_repo.get_conversation(
            user_id, with_user_id, limit=CHAT_HISTORY_LIMIT
        )
        partner = await user_repo.get_by_id(with_user_id)
        self_user = await user_repo.get_by_id(user_id)

        username_by_id = {}
        if partner is not None:
            username_by_id[partner.user_id] = partner.username
        if self_user is not None:
            username_by_id[self_user.user_id] = self_user.username

    messages = [
        _chat_message_dict(r, username_by_id.get(r.from_user_id, "?"))
        for r in rows
    ]

    await websocket.send_json(
        {
            "type": "chat_history_response",
            "withUserId": with_user_id,
            "messages": messages,
        }
    )
