""" Enhanced Chatbot - Better Song Detection, Recommendations, and Playlist Support """
import sys
import os
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq
from typing import List, Dict, Optional
import json
import re

load_dotenv()

class MusicChatbot:
    def __init__(self):
        # Initialize Gemini
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
            except Exception:
                self.gemini_model = None
        else:
            self.gemini_model = None
            
        # Groq key (lazy-initialized to make server startup instant)
        self.groq_api_key = os.getenv('GROQ_API_KEY') or os.getenv('Groq_API_Key')
        self._groq_client = None
            
        if not gemini_api_key and not self.groq_api_key:
            raise ValueError("Either GEMINI_API_KEY or GROQ_API_KEY must be found in environment variables")
        
        self.current_provider = 'groq' if self.groq_api_key else 'gemini'
        print(f"🤖 Chatbot ready (provider: {self.current_provider})")
        self.model = self.gemini_model
        self.chat = None
        self._cached_groq_model = None
        self.conversation_history: List[Dict] = []
        self.system_prompt = """You are MelodyMind, an AI music assistant that helps users find and play music.

CORE CAPABILITIES:
1. Direct Playback: When user wants to play a specific song
2. Playlist Playback: When user wants to play an entire playlist
3. Recommendations: Suggest songs based on mood, genre, or artist
4. Song Search: Find songs by lyrics, artist name, or description
5. Conversational: Engage naturally about music

RESPONSE FORMATS:

1. DIRECT PLAYBACK (user says "play X"):
   Format: [PLAY: Song Name - Artist Name]
   Example: "Sure! [PLAY: Shape of You - Ed Sheeran]"

2. PLAYLIST PLAYBACK (user says "play playlist X" or "start playlist X"):
   Format: [PLAYLIST: Playlist Name]
   Example: "Starting your [PLAYLIST: Workout Mix] playlist!"
   
   Detect phrases like:
   - "play playlist [name]"
   - "start [name] playlist"
   - "play my [name] playlist"
   - "queue [name] playlist"
   - "play [name] playlist"

3. RECOMMENDATIONS (user asks for suggestions):
   Format: [RECOMMEND: Song Name - Artist Name]
   Use multiple [RECOMMEND] tags
   Example: "Here are some upbeat songs:
   [RECOMMEND: Happy - Pharrell Williams]
   [RECOMMEND: Can't Stop the Feeling - Justin Timberlake]
   [RECOMMEND: Uptown Funk - Mark Ronson]"

4. SEARCH BY LYRICS/DESCRIPTION:
   When user provides lyrics or description, identify the song and use [PLAY] format
   Example:
   User: "Play that song about letting it go"
   You: "I think you mean [PLAY: Let It Go - Idina Menzel]"

IMPORTANT RULES:
- NEVER provide actual song lyrics (copyright)
- Always use [PLAY] for single song playback
- Always use [PLAYLIST] for playlist playback
- Always use [RECOMMEND] for multiple suggestions
- Be conversational and friendly
- If unsure about a song, ask for clarification

EXAMPLES:

User: "Play Bohemian Rhapsody"
You: "Great choice! [PLAY: Bohemian Rhapsody - Queen]"

User: "Play my Workout playlist"
You: "Starting your [PLAYLIST: Workout] playlist!"

User: "Start the Chill Vibes playlist"
You: "Loading [PLAYLIST: Chill Vibes] for you!"

User: "Play playlist Morning Energy"
You: "Sure thing! [PLAYLIST: Morning Energy]"

User: "I want something energetic for workout"
You: "Here are some high-energy workout songs:
[RECOMMEND: Eye of the Tiger - Survivor]
[RECOMMEND: Lose Yourself - Eminem]
[RECOMMEND: Thunder - Imagine Dragons]"

User: "Play that song that goes I'm walking on sunshine"
You: "I think you're looking for [PLAY: Walking on Sunshine - Katrina and the Waves]"

User: "Recommend some Coldplay songs"
You: "Here are some great Coldplay tracks:
[RECOMMEND: Yellow - Coldplay]
[RECOMMEND: Viva la Vida - Coldplay]
[RECOMMEND: Fix You - Coldplay]"

User: "Recommend me some music of Arijit Singh"
You: "Here are some popular tracks by Arijit Singh:
[RECOMMEND: Tum Hi Ho - Arijit Singh]
[RECOMMEND: Channa Mereya - Arijit Singh]
[RECOMMEND: Kesariya - Arijit Singh]
[RECOMMEND: Shayad - Arijit Singh]
[RECOMMEND: Gerua - Arijit Singh]"

User: "Songs by Taylor Swift"
You: "Here are popular Taylor Swift songs:
[RECOMMEND: Shake It Off - Taylor Swift]
[RECOMMEND: Blank Space - Taylor Swift]
[RECOMMEND: Anti-Hero - Taylor Swift]"

Remember: Always use standard ASCII hyphen (-) between song and artist. Always include singer/artist name. Be helpful, friendly, and music-focused!"""
        
        self._initialize_chat()

    @property
    def groq_client(self):
        """Lazy load Groq client so SSL / certifi loading doesn't delay startup"""
        if self._groq_client is None and self.groq_api_key:
            try:
                self._groq_client = Groq(api_key=self.groq_api_key)
            except Exception as e:
                print(f"❌ Groq init failed: {e}")
                self._groq_client = None
        return self._groq_client

    @groq_client.setter
    def groq_client(self, value):
        self._groq_client = value

    def _initialize_chat(self):
        """Initialize Gemini chat with system prompt"""
        if self.current_provider == 'gemini' and self.gemini_model:
            self.chat = self.model.start_chat(history=[])
            try:
                self.chat.send_message(self.system_prompt)
            except Exception as e:
                print(f"Warning: Could not set system prompt: {e}")
        elif self.current_provider == 'groq':
            pass  # Groq doesn't need pre-initialization

    def _switch_to_groq(self):
        """Switch to Groq when Gemini fails"""
        if not self.groq_client:
            raise Exception("Groq API not configured")
        self.current_provider = 'groq'
        print("Switched to Groq API")

    def _get_best_groq_model(self) -> str:
        """Find best available Groq model"""
        if getattr(self, '_cached_groq_model', None):
            return self._cached_groq_model

        candidates = [
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
            "llama-3.3-70b-versatile",
            "openai/gpt-oss-120b",
            "llama-3.1-8b-instant"
        ]
        try:
            available_models = [m.id for m in self.groq_client.models.list().data]
            for cand in candidates:
                if cand in available_models:
                    self._cached_groq_model = cand
                    return cand
            if available_models:
                self._cached_groq_model = available_models[0]
                return available_models[0]
        except Exception:
            pass
        self._cached_groq_model = "openai/gpt-oss-20b"
        return self._cached_groq_model

    def _get_groq_response(self, user_message: str) -> str:
        """Get response from Groq"""
        messages = [{"role": "system", "content": self.system_prompt}]
        
        for msg in self.conversation_history[-10:]:
            messages.append({
                "role": msg["role"] if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })
        
        messages.append({"role": "user", "content": user_message})
        
        model_name = self._get_best_groq_model()
        print(f"📡 Sending request to Groq (model: {model_name})...")
        response = self.groq_client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            timeout=30
        )
        print("Groq response received")
        return response.choices[0].message.content

    def _split_song_artist(self, raw_str: str) -> tuple:
        """Split a song string by any dash variant (-, –, —, −), colon, or 'by'"""
        cleaned = re.sub(r'[\s\u2000-\u200f\u202f\u00a0]+', ' ', raw_str).strip()
        parts = re.split(r'\s*(?:[\-–—−:]|\bby\b)\s*', cleaned, maxsplit=1)
        if len(parts) >= 2:
            return parts[0].strip(), parts[1].strip()
        return parts[0].strip(), ""

    def extract_play_command(self, response: str) -> Optional[Dict[str, str]]:
        """
        Extract PLAY command from response
        Format: [PLAY: Song Name - Artist Name]
        Returns: {"name": str, "artist": str, "autoplay": True} or None
        """
        match = re.search(r'\[PLAY:\s*([^\]]+?)\s*\]', response, re.IGNORECASE)
        if match:
            raw_content = match.group(1).strip()
            name, artist = self._split_song_artist(raw_content)
            if name:
                return {
                    "name": name,
                    "artist": artist,
                    "autoplay": True
                }
        return None

    def extract_playlist_command(self, response: str) -> Optional[str]:
        """
        Extract PLAYLIST command from response
        Format: [PLAYLIST: Playlist Name]
        Returns: playlist name or None
        """
        pattern = r'\[PLAYLIST:\s*([^\]]+?)\s*\]'
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return None

    def extract_recommendations(self, response: str) -> List[Dict[str, str]]:
        """
        Extract RECOMMEND commands from response
        Format: [RECOMMEND: Song Name - Artist Name]
        Supports all dash types (-, –, —, −), 'by', and bullet fallbacks.
        """
        songs = []
        matches = re.findall(r'\[RECOMMEND:\s*([^\]]+?)\s*\]', response, re.IGNORECASE)
        for match in matches:
            name, artist = self._split_song_artist(match)
            if name:
                songs.append({
                    "name": name,
                    "artist": artist
                })

        # Fallback: if no [RECOMMEND] tags used, look for numbered or bulleted lines
        if not songs:
            line_pattern = r'^\s*(?:\d+[\.\)]|[\*\-•])\s+["\']?([^"\'\n–—\-]+?)["\']?\s*(?:[\-–—−]|\bby\b)\s+["\']?([^"\'\n\(\)]+?)["\']?\s*$'
            for line in response.split('\n'):
                m = re.match(line_pattern, line.strip())
                if m:
                    s_name = m.group(1).strip()
                    s_artist = m.group(2).strip()
                    if s_name and len(s_name) > 1:
                        songs.append({"name": s_name, "artist": s_artist})

        return songs

    def chat_with_user(self, user_message: str) -> Dict:
        """
        Enhanced chat with better song detection and playlist support
        """
        try:
            # Try Gemini first
            if self.current_provider == 'gemini' and self.chat:
                try:
                    response = self.chat.send_message(user_message)
                    bot_response = response.text
                except Exception as e:
                    print(f"⚠️  Gemini request failed: {e}")
                    if self.groq_client:
                        self._switch_to_groq()
                        bot_response = self._get_groq_response(user_message)
                    else:
                        raise e
            # Use Groq
            elif self.groq_client:
                bot_response = self._get_groq_response(user_message)
            else:
                raise Exception("No API provider available")

            # Add to history
            self.conversation_history.append({
                "role": "user",
                "content": user_message
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": bot_response
            })

            # Check for PLAY command (direct playback)
            play_command = self.extract_play_command(bot_response)

            # Check for PLAYLIST command
            playlist_name = self.extract_playlist_command(bot_response)

            # Extract recommendations
            recommendations = self.extract_recommendations(bot_response)

            # Clean display text
            display_text = bot_response
            display_text = re.sub(r'\[PLAY:[^\]]+\]', '', display_text, flags=re.IGNORECASE)
            display_text = re.sub(r'\[PLAYLIST:[^\]]+\]', '', display_text, flags=re.IGNORECASE)
            if recommendations:
                display_text = re.sub(r'\[RECOMMEND:[^\]]+\]', '', display_text, flags=re.IGNORECASE)
            else:
                display_text = re.sub(r'\[RECOMMEND:\s*([^\]]+?)\]', r'🎵 \1', display_text, flags=re.IGNORECASE)
            display_text = re.sub(r'[\u2000-\u200f\u202f\u00a0]', ' ', display_text)
            display_text = re.sub(r'\n\s*\n+', '\n\n', display_text).strip()

            return {
                "response": display_text,
                "play_command": play_command,  # For direct playback
                "playlist_name": playlist_name,  # For playlist playback
                "recommended_songs": recommendations,  # For song buttons
                "has_play_command": play_command is not None,
                "has_playlist_command": playlist_name is not None,
                "has_recommendations": len(recommendations) > 0
            }

        except Exception as e:
            print(f"Chatbot error: {e}")
            return {
                "response": "I apologize, but I'm having trouble right now. Please try again.",
                "play_command": None,
                "playlist_name": None,
                "recommended_songs": [],
                "has_play_command": False,
                "has_playlist_command": False,
                "has_recommendations": False,
                "error": str(e)
            }

    def detect_intent(self, message: str) -> str:
        """
        Detect user intent from message
        Returns: 'play', 'playlist', 'recommend', 'search', or 'chat'
        """
        message_lower = message.lower()
        
        # Playlist intent (check first as it's more specific)
        if any(word in message_lower for word in ['playlist', 'play my', 'start my', 'queue my']):
            if any(word in message_lower for word in ['playlist', 'play list']):
                return 'playlist'
        
        # Play intent
        if any(word in message_lower for word in ['play ', 'listen to', 'put on']):
            return 'play'
        
        # Recommend intent
        if any(word in message_lower for word in ['recommend', 'suggest', 'songs by', 'similar to']):
            return 'recommend'
        
        # Search by lyrics/description
        if any(word in message_lower for word in ['that song', 'goes like', 'lyrics']):
            return 'search'
        
        return 'chat'

    def reset_conversation(self):
        """Reset conversation history"""
        self.conversation_history = []
        self._initialize_chat()
        return {"message": "Conversation reset successfully"}

# Global instance
chatbot = MusicChatbot()