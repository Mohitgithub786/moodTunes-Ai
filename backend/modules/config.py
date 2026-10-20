"""
Configuration Module
Handles all environment variables and API configurations
"""
import os
import sys
from dotenv import load_dotenv
from typing import Optional

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import pylast
from googleapiclient.discovery import build
import google.generativeai as genai
try:
    from deepgram import DeepgramClient
except ImportError:
    DeepgramClient = None

# Load environment variables
load_dotenv()

class Config:
    """Central configuration class"""
    
    # API Keys
    LASTFM_API_KEY: str = os.getenv("LASTFM_API_KEY", "")
    LASTFM_API_SECRET: str = os.getenv("LASTFM_API_SECRET", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "") or os.getenv("Groq_API_Key", "")
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # CORS Configuration
    CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
    
    # Cache Configuration
    CACHE_FILE: str = "youtube_cache.json"
    
    # API Service Instances
    lastfm_network: Optional[pylast.LastFMNetwork] = None
    youtube_service = None
    gemini_model = None
    deepgram_client = None
    
    @classmethod
    def initialize_services(cls):
        """Initialize all API services"""
        # Initialize Last.fm
        if cls.LASTFM_API_KEY and cls.LASTFM_API_SECRET:
            try:
                cls.lastfm_network = pylast.LastFMNetwork(
                    api_key=cls.LASTFM_API_KEY,
                    api_secret=cls.LASTFM_API_SECRET
                )
                print("✅ Last.fm initialized successfully")
            except Exception as e:
                print(f"❌ Last.fm initialization error: {e}")
        else:
            print("⚠️  Last.fm API keys not found")
        
        # Initialize YouTube
        if cls.YOUTUBE_API_KEY:
            try:
                cls.youtube_service = build('youtube', 'v3', developerKey=cls.YOUTUBE_API_KEY)
                print("✅ YouTube API initialized successfully")
            except Exception as e:
                print(f"❌ YouTube initialization error: {e}")
        else:
            print("⚠️  YouTube API key not found")
        
        # Initialize Gemini
        if cls.GEMINI_API_KEY:
            try:
                genai.configure(api_key=cls.GEMINI_API_KEY)
                cls.gemini_model = genai.GenerativeModel('gemini-2.5-flash-lite')
                print("✅ Gemini AI initialized successfully")
            except Exception as e:
                print(f"❌ Gemini initialization error: {e}")
        else:
            print("⚠️  Gemini API key not found")
        
        # Initialize Deepgram
        if cls.DEEPGRAM_API_KEY and DeepgramClient:
            try:
                try:
                    cls.deepgram_client = DeepgramClient(api_key=cls.DEEPGRAM_API_KEY)
                except TypeError:
                    cls.deepgram_client = DeepgramClient(cls.DEEPGRAM_API_KEY)
                print("✅ Deepgram initialized successfully")
            except Exception as e:
                print(f"❌ Deepgram initialization error: {e}")
        elif not DeepgramClient:
            print("⚠️  Deepgram SDK not installed")
        else:
            print("⚠️  Deepgram API key not found")
    
    @classmethod
    def get_lastfm(cls):
        """Get Last.fm network instance"""
        return cls.lastfm_network
    
    @classmethod
    def get_youtube(cls):
        """Get YouTube service instance"""
        return cls.youtube_service
    
    @classmethod
    def get_gemini(cls):
        """Get Gemini model instance"""
        return cls.gemini_model
    
    @classmethod
    def get_deepgram(cls):
        """Get Deepgram client instance"""
        return cls.deepgram_client

# Initialize services on module load
Config.initialize_services()
