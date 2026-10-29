"""
User Service - MongoDB CRUD operations for users with in-memory fallback
"""
from typing import Optional, Dict
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
import uuid

from modules.database import get_database
from modules.auth import hash_password, verify_password

# In-memory storage fallback when MongoDB is not connected
_in_memory_users: Dict[str, dict] = {}


class UserService:
    """Service for user operations such as creating a user, login, and lookup."""

    @staticmethod
    async def create_user(email: str, password: str, full_name: str) -> dict:
        database = get_database()

        # In-memory fallback
        if database is None:
            for u in _in_memory_users.values():
                if u["email"].lower() == email.lower():
                    raise HTTPException(status_code=400, detail="Email already registered")

            user_id = str(uuid.uuid4())[:8]
            user_record = {
                "id": user_id,
                "email": email,
                "password": hash_password(password),
                "full_name": full_name,
                "created_at": datetime.utcnow().isoformat(),
            }
            _in_memory_users[user_id] = user_record
            return {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "created_at": user_record["created_at"],
            }

        # MongoDB implementation
        existing_user = await database.users.find_one({"email": email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = hash_password(password)

        user_data = {
            "email": email,
            "password": hashed_password,
            "full_name": full_name,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await database.users.insert_one(user_data)
        user_id = str(result.inserted_id)

        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "created_at": user_data["created_at"],
        }

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[dict]:
        database = get_database()
        if database is None:
            for u in _in_memory_users.values():
                if u["email"].lower() == email.lower():
                    if verify_password(password, u["password"]):
                        return {
                            "id": u["id"],
                            "email": u["email"],
                            "full_name": u.get("full_name", ""),
                            "created_at": u.get("created_at", ""),
                        }
                    return None
            return None

        user = await database.users.find_one({"email": email})
        if not user:
            return None

        if not verify_password(password, user["password"]):
            return None

        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "created_at": user.get("created_at", ""),
        }

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        database = get_database()
        if database is None:
            u = _in_memory_users.get(user_id)
            if not u:
                return None
            return {
                "id": u["id"],
                "email": u["email"],
                "full_name": u.get("full_name", ""),
                "created_at": u.get("created_at", ""),
            }

        try:
            obj_id = ObjectId(user_id)
        except InvalidId:
            return None

        user = await database.users.find_one({"_id": obj_id})
        if not user:
            return None

        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "created_at": user.get("created_at", ""),
        }


user_service = UserService()
