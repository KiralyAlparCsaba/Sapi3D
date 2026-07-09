import bcrypt
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import IntEnum
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from repositories.user_repository import UserRepository
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession


class Roles(IntEnum):
    """Central role constants — keep in sync with the seeded `roles` table."""
    GUEST = 0
    USER = 1
    ADMIN = 2


@dataclass
class GuestUser:
    """Lightweight stand-in for a DB User when role_id == 0 (guest)."""
    user_id: int = 0
    username: str = "Vendég"
    role_id: int = 0
    session_id: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None


def hash_password(password: str) -> str:
    """Hash plain password using bcrypt.

    Password byte length is validated at the schema level (max 72 bytes,
    bcrypt's hard limit), so no silent truncation happens here.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except ValueError:
        # e.g. password longer than bcrypt's 72-byte limit (legacy data)
        return False


SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "sub": payload.get("sub"),
            "username": payload.get("username"),
            "role_id": payload.get("role_id"),
            "session_id": payload.get("session_id"),
            "exp": payload.get("exp"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )



security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)

    
    if payload.get("role_id") == 0:
        return GuestUser()

    username = payload.get("username")
    session_id = payload.get("session_id")

    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    repo = UserRepository(db)
    user = await repo.get_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    
    user.session_id = session_id

    return user


async def require_registered_user(current_user=Depends(get_current_user)):
    """Dependency: reject guest tokens — a real registered account is required."""
    if getattr(current_user, "role_id", Roles.GUEST) == Roles.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registered account required",
        )
    return current_user


async def require_admin(current_user=Depends(get_current_user)):
    """Dependency: only admins (role_id == Roles.ADMIN) may access."""
    if getattr(current_user, "role_id", Roles.GUEST) != Roles.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return current_user
