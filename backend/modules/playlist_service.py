"""
Playlist Service - MongoDB CRUD operations with in-memory fallback
"""
from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
import uuid

from modules.database import get_database
from modules.models import Song

# In-memory storage fallback when MongoDB is not connected
_in_memory_playlists: Dict[str, dict] = {}


class PlaylistService:
    """Service for playlist operations"""

    @staticmethod
    async def create_playlist(
        user_id: str,
        name: str,
        description: str = "",
        mood: Optional[str] = None,
        songs: Optional[List[Song]] = None,
        is_public: bool = False
    ) -> dict:

        database = get_database()
        songs = songs or []
        song_dicts = [song.dict() if hasattr(song, "dict") else song for song in songs]

        if database is None:
            pl_id = f"pl_{uuid.uuid4().hex[:8]}"
            pl_data = {
                "id": pl_id,
                "user_id": user_id,
                "name": name,
                "description": description,
                "mood": mood,
                "songs": song_dicts,
                "is_public": is_public,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            _in_memory_playlists[pl_id] = pl_data
            return pl_data

        playlist_data = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "mood": mood,
            "songs": song_dicts,
            "is_public": is_public,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await database.playlists.insert_one(playlist_data)

        return {
            "id": str(result.inserted_id),
            "user_id": user_id,
            "name": name,
            "description": description,
            "mood": mood,
            "songs": song_dicts,
            "is_public": is_public,
            "created_at": playlist_data["created_at"],
            "updated_at": playlist_data["updated_at"],
        }

    @staticmethod
    async def get_user_playlists(user_id: str) -> List[dict]:
        database = get_database()
        if database is None:
            return [p for p in _in_memory_playlists.values() if p.get("user_id") == user_id]

        playlists = []
        cursor = database.playlists.find({"user_id": user_id})
        async for playlist in cursor:
            playlist["id"] = str(playlist["_id"])
            del playlist["_id"]
            playlists.append(playlist)

        return playlists

    @staticmethod
    async def get_playlist(playlist_id: str, user_id: str) -> dict:
        database = get_database()
        if database is None:
            p = _in_memory_playlists.get(playlist_id)
            if not p or p.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Playlist not found")
            return p

        try:
            obj_id = ObjectId(playlist_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid playlist ID format")

        playlist = await database.playlists.find_one({"_id": obj_id, "user_id": user_id})
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")

        playlist["id"] = str(playlist["_id"])
        del playlist["_id"]

        return playlist

    @staticmethod
    async def update_playlist(playlist_id: str, user_id: str, update_data: dict) -> dict:
        database = get_database()
        if database is None:
            p = _in_memory_playlists.get(playlist_id)
            if not p or p.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Playlist not found")
            p.update(update_data)
            p["updated_at"] = datetime.utcnow().isoformat()
            return p

        try:
            obj_id = ObjectId(playlist_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid playlist ID format")

        update_data["updated_at"] = datetime.utcnow().isoformat()

        result = await database.playlists.update_one(
            {"_id": obj_id, "user_id": user_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Playlist not found")

        return await PlaylistService.get_playlist(playlist_id, user_id)

    @staticmethod
    async def delete_playlist(playlist_id: str, user_id: str) -> dict:
        database = get_database()
        if database is None:
            p = _in_memory_playlists.get(playlist_id)
            if not p or p.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Playlist not found")
            del _in_memory_playlists[playlist_id]
            return {"message": "Playlist deleted successfully", "playlist_id": playlist_id}

        try:
            obj_id = ObjectId(playlist_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid playlist ID format")

        result = await database.playlists.delete_one({"_id": obj_id, "user_id": user_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Playlist not found")

        return {"message": "Playlist deleted successfully", "playlist_id": playlist_id}

    @staticmethod
    async def add_song_to_playlist(playlist_id: str, user_id: str, song: Song) -> dict:
        database = get_database()
        song_dict = song.dict() if hasattr(song, "dict") else song

        if database is None:
            p = _in_memory_playlists.get(playlist_id)
            if not p or p.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Playlist not found")
            p["songs"].append(song_dict)
            p["updated_at"] = datetime.utcnow().isoformat()
            return p

        try:
            obj_id = ObjectId(playlist_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid playlist ID format")

        result = await database.playlists.update_one(
            {"_id": obj_id, "user_id": user_id},
            {
                "$push": {"songs": song_dict},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Playlist not found")

        return await PlaylistService.get_playlist(playlist_id, user_id)

    @staticmethod
    async def remove_song_from_playlist(playlist_id: str, user_id: str, song_id: str) -> dict:
        database = get_database()
        if database is None:
            p = _in_memory_playlists.get(playlist_id)
            if not p or p.get("user_id") != user_id:
                raise HTTPException(status_code=404, detail="Playlist not found")
            p["songs"] = [s for s in p["songs"] if s.get("id") != song_id]
            p["updated_at"] = datetime.utcnow().isoformat()
            return p

        try:
            obj_id = ObjectId(playlist_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid playlist ID format")

        result = await database.playlists.update_one(
            {"_id": obj_id, "user_id": user_id},
            {
                "$pull": {"songs": {"id": song_id}},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Playlist not found")

        return await PlaylistService.get_playlist(playlist_id, user_id)


playlist_service = PlaylistService()
