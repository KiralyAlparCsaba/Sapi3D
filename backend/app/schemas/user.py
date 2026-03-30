from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator


# Role Schemas
class RoleBase(BaseModel):
    """Base schema for Role."""
    role_name: str = Field(..., max_length=50)


class RoleCreate(RoleBase):
    """Schema for creating a Role."""
    pass


class RoleResponse(RoleBase):
    """Schema for Role response."""
    role_id: int
    
    model_config = ConfigDict(from_attributes=True)


# User Schemas
class UserBase(BaseModel):
    """Base schema for User."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a User."""
    password: str = Field(..., min_length=8, max_length=100)
    role_id: int = Field(default=1)  # Default to regular user role

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        missing = []
        if not any(ch.islower() for ch in value):
            missing.append("at least one lowercase letter")
        if not any(ch.isupper() for ch in value):
            missing.append("at least one uppercase letter")
        if not any(ch.isdigit() for ch in value):
            missing.append("at least one digit")

        if missing:
            raise ValueError(f"Password must contain {', '.join(missing)}")
        return value


class UserUpdate(BaseModel):
    """Schema for updating a User."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    role_id: Optional[int] = None


class UserResponse(UserBase):
    """Schema for User response."""
    user_id: int
    avatar_url: Optional[str] = None
    role_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserWithRole(UserResponse):
    """Schema for User response with role information."""
    role: RoleResponse
    
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class Token(BaseModel):
    """Schema for authentication token."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token data."""
    user_id: Optional[int] = None
    username: Optional[str] = None
