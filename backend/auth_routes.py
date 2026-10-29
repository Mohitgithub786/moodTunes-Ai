"""
Authentication Router
Modular authentication endpoints for MoodTunes AI
"""
from fastapi import APIRouter, HTTPException, Depends
from modules.auth import (
    UserSignup, UserLogin, TokenResponse, UserResponse,
    create_access_token, get_current_user
)
from modules.user_service import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    """Register a new user"""
    user = await user_service.create_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, user=UserResponse(**user))


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Authenticate and login user"""
    user = await user_service.authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, user=UserResponse(**user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get profile of current authenticated user"""
    user = await user_service.get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@router.post("/logout")
async def logout():
    """Logout user"""
    return {"message": "Logged out successfully"}
