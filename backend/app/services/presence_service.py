"""
Presence Service - In-memory multiplayer connection and state manager.

Tracks who is currently connected via WebSocket, their last known position
and rotation, and provides broadcast helpers.

NOTE: This is in-memory only. If you ever run multiple backend instances,
swap this for a Redis-backed implementation.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections import deque
from dataclasses import dataclass, field
from time import monotonic
from typing import Deque, Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


RATE_LIMIT_PER_SEC = 15
RATE_LIMIT_WINDOW = 1.0  # seconds


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
    has_position: bool = False
    msg_times: Deque[float] = field(default_factory=deque)

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

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
        username: str,
        avatar_url: Optional[str],
    ) -> PlayerState:
        """Register a new connection. The websocket must already be accepted."""
        async with self._lock:
           
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
        """
        async with self._lock:
            current = self._players.get(user_id)
            if current is not None and current.websocket is websocket:
                was_visible = current.has_position
                del self._players[user_id]
                logger.info(f"[MP] User {user_id} disconnected. Online: {len(self._players)}")
                return True, was_visible
          
            logger.info(f"[MP] Stale disconnect for user {user_id} ignored (newer connection active)")
            return False, False

    def update_position(self, user_id: int, x: float, y: float, z: float, rot_y: float) -> bool:
        """Update a player's position and rotation. Returns True if this is the first real position."""
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

    def check_rate_limit(self, user_id: int) -> bool:
        """
        Returns True if the user is within their per-second message budget.
        Returns False if they should be silently dropped this message.

        Uses a sliding-window log of timestamps. Normal clients send at ~10Hz,
        so the 15/sec cap leaves room for legitimate bursts (e.g., a brief
        catchup after a network hiccup) while stopping a malicious or buggy
        client from flooding the server.
        """
        p = self._players.get(user_id)
        if p is None:
            return False
        now = monotonic()
        times = p.msg_times
        cutoff = now - RATE_LIMIT_WINDOW
        # Drop expired timestamps from the front.
        while times and times[0] < cutoff:
            times.popleft()
        if len(times) >= RATE_LIMIT_PER_SEC:
            return False
        times.append(now)
        return True

    async def send_to(self, user_id: int, message: dict) -> None:
        """Send a JSON message to a specific user."""
        p = self._players.get(user_id)
        if p is None:
            return
        try:
            await p.websocket.send_text(json.dumps(message, separators=(",", ":")))
        except Exception as e:
            logger.warning(f"[MP] Failed to send to user {user_id}: {e}")

    async def broadcast(self, message: dict, exclude_user_id: Optional[int] = None) -> None:
        """
        Send a JSON message to all connected users in parallel.

        Two key optimizations vs the naïve loop-with-await version:
        1. JSON is serialized ONCE, not per-recipient. At 50 users that's a
           49x reduction in json.dumps calls per broadcast.
        2. Sends happen concurrently via asyncio.gather, so a single slow
           client can't head-of-line block delivery to everyone else.

        At 50 users × 10Hz updates, the old serial path would dispatch ~24k
        send operations/sec on the event loop. With parallel+pre-serialized
        sends, throughput easily fits in a single uvicorn worker.
        """
        targets = [
            p for uid, p in self._players.items() if uid != exclude_user_id
        ]
        if not targets:
            return

        payload = json.dumps(message, separators=(",", ":"))

        results = await asyncio.gather(
            *(p.websocket.send_text(payload) for p in targets),
            return_exceptions=True,
        )

        for p, result in zip(targets, results):
            if isinstance(result, Exception):
                logger.warning(
                    f"[MP] Broadcast failed for user {p.user_id}: {result}"
                )



connection_manager = ConnectionManager()
