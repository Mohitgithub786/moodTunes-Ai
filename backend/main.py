import sys
# Ensure UTF-8 output on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional
from datetime import datetime
from collections import defaultdict

# Config
from modules.config import Config

# Models
from modules.models import (
    MoodDetectionResponse,
    Song,
    RecommendationRequest,
    PersonalizedRecommendationRequest,
    ChatMessage,
    PlaylistCreate,
    PlaylistCreateAuth,
    PlaylistUpdateAuth,
    AddSongToPlaylist
)

# Feature modules
from modules.mood_detection import MoodDetector
from modules.recommendation_engine import recommendation_engine
from modules.music_player import music_player
from modules.chatbot import chatbot
from modules.voice_to_text import voice_to_text

# Auth
from modules.auth import (
    UserSignup,
    UserLogin,
    UserResponse,
    TokenResponse,
    create_access_token,
    get_current_user
)

# Services
from modules.user_service import user_service
from modules.playlist_service import playlist_service

# Database
from modules.database import connect_to_mongodb, close_mongodb_connection, get_database


# -----------------------------------------------------------
# FASTAPI APP
# -----------------------------------------------------------
app = FastAPI(
    title="MoodTunes AI - Modular Music Recommender API",
    description="AI-powered music recommendation system with mood detection and voice control",
    version="3.3-enhanced"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# -----------------------------------------------------------
# LOCAL IN-MEMORY PLAYLIST STORAGE
# -----------------------------------------------------------
user_playlists = defaultdict(list)
user_preferences = defaultdict(lambda: {
    'favorite_artists': [],
    'favorite_genres': [],
    'listening_patterns': {},
    'mood_history': []
})


# -----------------------------------------------------------
# STARTUP EVENT (UPDATED WITH FIX)
# -----------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Connect to DB and initialize heavy models safely"""
    print("🚀 Starting MoodTunes…")

    # 1. Connect MongoDB
    await connect_to_mongodb()

    # 2. Load DeepFace / TensorFlow IN THREAD (non-blocking)
    

    print(" Startup completed successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    await close_mongodb_connection()
    print("🛑 Shutdown complete")


# ===========================================================
#  MOOD DETECTION
# ===========================================================
@app.post("/detect-mood", response_model=MoodDetectionResponse)
async def detect_mood(file: UploadFile = File(...)):
    return await MoodDetector.detect_from_image(file)


@app.post("/detect-mood-manual")
async def detect_mood_manual(mood: str):
    if not MoodDetector.validate_mood(mood):
        raise HTTPException(status_code=400, detail="Invalid mood")
    return {"mood": mood.lower(), "message": f"Mood set to {mood.lower()}"}


@app.get("/moods")
async def get_available_moods():
    return {"moods": MoodDetector.get_all_moods()}


# ===========================================================
#  RECOMMENDATIONS
# ===========================================================
@app.post("/api/personalized-recommendations")
async def get_personalized_recommendations(request: PersonalizedRecommendationRequest):
    return await asyncio.to_thread(recommendation_engine.get_personalized_recommendations, request)


@app.post("/api/recommendations", response_model=Dict)
async def get_basic_recommendations(request: RecommendationRequest):
    return await asyncio.to_thread(recommendation_engine.get_basic_recommendations, request)


@app.get("/search-music")
async def search_music(query: str, limit: int = 5):
    results = await asyncio.to_thread(recommendation_engine.search_music, query, limit)
    return {"results": results, "total": len(results), "query": query}


@app.get("/search-song")
async def search_specific_song(name: str, artist: Optional[str] = None):
    """
    Fast song search for chatbot - uses direct YouTube search
    """
    try:
        print(f"\n🔍 Chatbot Song Search: '{name}' by {artist}")
        
        # Use direct YouTube search (fast)
        query = f"{artist} {name}" if artist else name
        results = await asyncio.to_thread(recommendation_engine.search_music, query, limit=1)
        
        if not results or len(results) == 0:
            raise HTTPException(status_code=404, detail=f"Song '{name}' not found")
        
        song = results[0]
        print(f"✅ Found: {song.name} by {song.artist}")
        print(f"   YouTube ID: {song.youtube_id}\n")
        
        return song
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error searching song: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/similar-songs")
async def get_similar_songs(song_name: str, artist: Optional[str] = None, limit: int = 10):
    track = await asyncio.to_thread(recommendation_engine.search_track, song_name, artist)
    if not track:
        raise HTTPException(status_code=404, detail="Song not found")

    similars = await asyncio.to_thread(
        recommendation_engine.get_similar_tracks,
        track.name,
        track.artist,
        limit=limit
    )
    return {"original_song": track, "similar_songs": similars}


# ===========================================================
#  YOUTUBE PLAYER
# ===========================================================
@app.get("/youtube/search")
async def search_youtube(song_name: str, artist: str):
    result = await asyncio.to_thread(music_player.search_and_get_url, song_name, artist)
    if not result:
        raise HTTPException(status_code=404, detail="YouTube video not found")
    return result


@app.get("/youtube/cache-stats")
async def get_cache_stats():
    return music_player.get_cache_stats()


@app.post("/youtube/clear-cache")
async def clear_youtube_cache():
    music_player.clear_cache()
    return {"message": "YouTube cache cleared"}


# ===========================================================
#  CHATBOT
# ===========================================================
@app.post("/chat")
async def chat_with_bot(message: ChatMessage):
    result = await asyncio.to_thread(chatbot.chat_with_user, message.message)
    return {
        "response": result["response"],
        "play_command": result.get("play_command"),
        "playlist_name": result.get("playlist_name"),
        "recommended_songs": result.get("recommended_songs", [])
    }


@app.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str):
    return chatbot.conversation_history[-50:]


@app.delete("/chat/history/{user_id}")
async def clear_chat_history(user_id: str):
    chatbot.reset_conversation()
    return {"message": "Chat history cleared"}


# ===========================================================
#  VOICE TO TEXT
# ===========================================================
@app.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...), language: str = "auto"):
    transcript = await voice_to_text.transcribe_audio(file, language)
    return {"transcript": transcript, "language": language}


# ===========================================================
#  PUBLIC PLAYLISTS (IN-MEMORY)
# ===========================================================
@app.post("/playlists", response_model=dict)
async def create_playlist(playlist: PlaylistCreate):
    playlist_id = f"pl_{int(datetime.now().timestamp())}"

    new_playlist = {
        "id": playlist_id,
        "name": playlist.name,
        "description": playlist.description,
        "mood": playlist.mood,
        "songs": playlist.songs,
        "created_at": datetime.now().isoformat(),
        "user_id": playlist.user_id
    }

    user_playlists[playlist.user_id].append(new_playlist)
    return new_playlist


@app.get("/playlists")
async def get_user_playlists(user_id: str = "default"):
    return user_playlists[user_id]


@app.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, user_id: str = "default"):
    user_playlists[user_id] = [
        p for p in user_playlists[user_id] if p["id"] != playlist_id
    ]
    return {"message": "Playlist deleted"}


# ===========================================================
#  AUTHENTICATION
# ===========================================================
@app.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    user = await user_service.create_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, user=UserResponse(**user))


@app.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await user_service.authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, user=UserResponse(**user))


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await user_service.get_user_by_id(current_user["user_id"])
    return UserResponse(**user)


@app.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}


# ===========================================================
#  AUTH PLAYLISTS (MONGODB)
# ===========================================================

# Create new playlist
@app.post("/api/playlists")
async def create_user_playlist(
    playlist_data: PlaylistCreateAuth,
    current_user: dict = Depends(get_current_user)
):
    return await playlist_service.create_playlist(
        user_id=current_user["user_id"],
        name=playlist_data.name,
        description=playlist_data.description,
        mood=playlist_data.mood,
        songs=playlist_data.songs,
        is_public=playlist_data.is_public
    )


# Get all user playlists
@app.get("/api/playlists")
async def get_my_playlists(current_user: dict = Depends(get_current_user)):
    return await playlist_service.get_user_playlists(current_user["user_id"])


# Get playlist by name for chatbot
@app.get("/api/playlists/by-name/{playlist_name}")
async def get_playlist_by_name(
    playlist_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Get playlist by name (case-insensitive) for chatbot use"""
    database = get_database()
    if database is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Case-insensitive search
    playlist = await database.playlists.find_one({
        "user_id": current_user["user_id"],
        "name": {"$regex": f"^{playlist_name}$", "$options": "i"}
    })
    
    if not playlist:
        raise HTTPException(status_code=404, detail=f"Playlist '{playlist_name}' not found")
    
    playlist["id"] = str(playlist["_id"])
    del playlist["_id"]
    
    return playlist


# Get specific playlist
@app.get("/api/playlists/{playlist_id}")
async def get_playlist(
    playlist_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await playlist_service.get_playlist(playlist_id, current_user["user_id"])


# Update playlist
@app.put("/api/playlists/{playlist_id}")
async def update_playlist(
    playlist_id: str,
    playlist_data: PlaylistUpdateAuth,
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in playlist_data.dict().items() if v is not None}
    if "songs" in update_data:
        update_data["songs"] = [song.dict() for song in update_data["songs"]]
    return await playlist_service.update_playlist(playlist_id, current_user["user_id"], update_data)


# Delete playlist
@app.delete("/api/playlists/{playlist_id}")
async def delete_playlist(
    playlist_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await playlist_service.delete_playlist(playlist_id, current_user["user_id"])


# Add song to playlist
@app.post("/api/playlists/{playlist_id}/songs")
async def add_song_to_playlist(
    playlist_id: str,
    song_data: AddSongToPlaylist,
    current_user: dict = Depends(get_current_user)
):
    return await playlist_service.add_song_to_playlist(playlist_id, current_user["user_id"], song_data.song)


# Remove song from playlist
@app.delete("/api/playlists/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(
    playlist_id: str,
    song_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await playlist_service.remove_song_from_playlist(playlist_id, current_user["user_id"], song_id)


# ===========================================================
#  HEALTH & ROOT
# ===========================================================
@app.get("/health")
async def health():
    return {"status": "healthy", "version": "3.3-enhanced"}


@app.get("/")
async def root():
    return {
        "app": "MoodTunes AI",
        "version": "3.3-enhanced",
        "message": "Running successfully!"
    }


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 70)
    print("🎵 MoodTunes AI - Music Recommendation System")
    print("=" * 70)
    uvicorn.run("main:app", host=Config.HOST, port=Config.PORT, reload=Config.RELOAD)
