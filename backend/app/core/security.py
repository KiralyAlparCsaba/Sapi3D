import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from repositories.user_repository import UserRepository
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession


# --- BCRYPT HASH ---
def hash_password(password: str) -> str:
    """Hash plain password using bcrypt."""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# --- JWT TOKEN MANAGEMENT ---
SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_expire_minutes


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
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
            "exp": payload.get("exp"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )



# --- CURRENT USER DEPENDENCY (using HTTP Bearer) ---
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    username = payload.get("username")

    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    repo = UserRepository(db)
    user = await repo.get_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
