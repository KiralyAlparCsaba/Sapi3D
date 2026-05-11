"""
Presence Service - In-memory multiplayer connection and state manager.

Tracks who is currently connected via WebSocket, their last known position
and rotation, and provides broadcast helpers.

NOTE: This is in-memory only. If you ever run multiple backend instances,
swap this for a Redis-backed implementation.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class PlayerState:
    """In-memory snapshot of one connected player."""
    user_id: int
    username: str
    avatar_url: Optional[str]
    websocket: WebSocket
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    rot_y: float = 0.0
    # True once the client has sent at least one real position. Until then the
    # player is "invisible" to others — we don't broadcast user_joined with the
    # fake default (0,0,0) coordinate, which would otherwise make capsules
    # briefly appear at the world origin.
    has_position: bool = False

    def public_dict(self) -> dict:
        """Serializable info about the player (no websocket)."""
        return {
            "userId": self.user_id,
            "username": self.username,
            "avatarUrl": self.avatar_url,
            "x": self.x,
            "y": self.y,
            "z": self.z,
            "rotY": self.rot_y,
        }


class ConnectionManager:
    """Singleton-style manager for all live multiplayer connections."""

    def __init__(self) -> None:
        self._players: Dict[int, PlayerState] = {}
        self._lock = asyncio.Lock()

    # ──────────────────────────────────────────────
    # CONNECT / DISCONNECT
    # ──────────────────────────────────────────────
    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
        username: str,
        avatar_url: Optional[str],
    ) -> PlayerState:
        """Register a new connection. The websocket must already be accepted."""
        async with self._lock:
            # If the same user reconnects, drop the old socket first.
            existing = self._players.get(user_id)
            if existing is not None:
                try:
                    await existing.websocket.close(code=4000, reason="Reconnected")
                except Exception:
                    pass

            state = PlayerState(
                user_id=user_id,
                username=username,
                avatar_url=avatar_url,
                websocket=websocket,
            )
            self._players[user_id] = state
            logger.info(f"[MP] User {user_id} ({username}) connected. Online: {len(self._players)}")
            return state

    async def disconnect(self, user_id: int, websocket: WebSocket) -> tuple[bool, bool]:
        """
        Remove a user from the registry, but ONLY if the given websocket is
        still the currently registered one for that user.

        Identity check is critical: when the same user reconnects (new tab,
        React StrictMode double-mount, etc.) we replace the entry in
        `connect()`. The OLD websocket then receives a close event and runs
        its finally block; without this check, that would delete the NEW
        connection's entry, orphaning the live websocket.

        Returns:
            (removed, was_visible)
            - removed: True if we actually deleted the entry
            - was_visible: True if the user had been broadcast to others
              (i.e., had_position was True). When False, the caller should
              NOT broadcast user_left — others never saw them in the first
              place.
        """
        async with self._lock:
            current = self._players.get(user_id)
            if current is not None and current.websocket is websocket:
                was_visible = current.has_position
                del self._players[user_id]
                logger.info(f"[MP] User {user_id} disconnected. Online: {len(self._players)}")
                return True, was_visible
            # The websocket was already replaced by a newer connection — leave it alone.
            logger.info(f"[MP] Stale disconnect for user {user_id} ignored (newer connection active)")
            return False, False

    # ──────────────────────────────────────────────
    # STATE UPDATES
    # ──────────────────────────────────────────────
    def update_position(self, user_id: int, x: float, y: float, z: float, rot_y: float) -> bool:
        """
        Cheap, lock-free update of player position. Safe because asyncio is
        single-threaded.

        Returns True if this was the player's *first* real position update —
        the caller should then broadcast a user_joined event so that others
        learn about this player at their actual location (not (0,0,0)).
        """
        p = self._players.get(user_id)
        if p is None:
            return False
        first = not p.has_position
        p.x = x
        p.y = y
        p.z = z
        p.rot_y = rot_y
        p.has_position = True
        return first

    def get_player(self, user_id: int) -> Optional[PlayerState]:
        return self._players.get(user_id)

    # ──────────────────────────────────────────────
    # QUERIES
    # ──────────────────────────────────────────────
    def get_others(self, user_id: int) -> list[dict]:
        """Public info about everyone except the requester. Skips players
        whose first real position hasn't arrived yet — they aren't visible."""
        return [
            p.public_dict()
            for uid, p in self._players.items()
            if uid != user_id and p.has_position
        ]

    def count(self) -> int:
        return len(self._players)

    # ──────────────────────────────────────────────
    # BROADCAST
    # ──────────────────────────────────────────────
    async def send_to(self, user_id: int, message: dict) -> None:
        """Send a JSON message to a specific user."""
        p = self._players.get(user_id)
        if p is None:
            return
        try:
            await p.websocket.send_json(message)
        except Exception as e:
            logger.warning(f"[MP] Failed to send to user {user_id}: {e}")

    async def broadcast(self, message: dict, exclude_user_id: Optional[int] = None) -> None:
        """Send a JSON message to all connected users, optionally excluding one."""
        # Snapshot the player list so we can iterate without holding the lock.
        targets = [
            (uid, p) for uid, p in self._players.items() if uid != exclude_user_id
        ]
        for uid, p in targets:
            try:
                await p.websocket.send_json(message)
            except Exception as e:
                logger.warning(f"[MP] Broadcast failed for user {uid}: {e}")


# Module-level singleton. Import this from routers.
connection_manager = ConnectionManager()
