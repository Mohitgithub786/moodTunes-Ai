"""
modules/database.py
MongoDB connection utilities and minimal helpers.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId
from bson.errors import InvalidId

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", None)
DATABASE_NAME = os.getenv("DATABASE_NAME", "moodtunes_ai")

# Global client + database
_client: Optional[AsyncIOMotorClient] = None
_database = None

async def connect_to_mongodb():
    """Connect to MongoDB and ensure indexes."""
    global _client, _database
    if not MONGODB_URL:
        print("⚠️  MONGODB_URL not set in environment. MongoDB features will be disabled.")
        _database = None
        return

    try:
        _client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        _database = _client[DATABASE_NAME]
        # test connection with short timeout
        await _client.admin.command("ping")
        # indexes
        await _database.users.create_index("email", unique=True)
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}. Auth and DB playlists will be unavailable.")
        _database = None

async def close_mongodb_connection():
    global _client
    if _client:
        _client.close()
        print("✅ MongoDB connection closed")

def get_database():
    """Return DB instance or None."""
    return _database
