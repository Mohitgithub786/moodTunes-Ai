"""
Music Player Module - Fixed Invidious errors
"""
import json
import os
import requests
from typing import Optional
from .config import Config

import re
import urllib.parse
import urllib.request

class MusicPlayer:
    
    def __init__(self):
        self.cache_file = Config.CACHE_FILE
        self.cache = self.load_cache()
        self.youtube = Config.get_youtube()
    
    def load_cache(self) -> dict:
        
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_cache(self):
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2)
        except:
            pass

    def get_youtube_id_direct(self, query: str) -> Optional[str]:
        """Direct YouTube search fallback if API quota is reached"""
        try:
            url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query + ' official')}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                video_ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                if video_ids:
                    return video_ids[0]
        except Exception:
            pass
        return None
    
    def get_youtube_id_invidious(self, query: str) -> Optional[str]:
        """Try Invidious instances - with short timeout"""
        instances = [
            "https://inv.tux.pizza",
            "https://invidious.fdn.fr"
        ]
        
        for instance in instances:
            try:
                response = requests.get(
                    f"{instance}/api/v1/search",
                    params={"q": f"{query} official", "type": "video"},
                    timeout=1
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        video_data = data[0]
                        video_id = video_data.get('videoId') or video_data.get('id')
                        
                        if isinstance(video_id, dict):
                            video_id = video_id.get('videoId')
                        
                        if video_id:
                            return video_id
            except:
                continue
        
        return None
    
    def get_youtube_id_official(self, query: str) -> Optional[str]:
        """Official YouTube API"""
        if not self.youtube:
            return None
        
        try:
            request = self.youtube.search().list(
                q=f"{query} official",
                part='id',
                maxResults=1,
                type='video'
            )
            response = request.execute()
            
            if response.get('items'):
                video_id = response['items'][0]['id'].get('videoId')
                return video_id
        except:
            pass
        
        return None
    
    def get_youtube_id(self, query: str) -> Optional[str]:
        """Get YouTube ID with caching"""
        if query in self.cache:
            return self.cache[query]
        
        # Try official API first (more reliable)
        video_id = self.get_youtube_id_official(query)
        
        # Fallback to direct web search
        if not video_id:
            video_id = self.get_youtube_id_direct(query)

        # Fallback to Invidious
        if not video_id:
            video_id = self.get_youtube_id_invidious(query)
        
        if video_id:
            self.cache[query] = video_id
            self.save_cache()
        
        return video_id
    
    def get_embed_url(self, video_id: str, autoplay: bool = True) -> str:
        autoplay_param = "1" if autoplay else "0"
        return f"https://www.youtube.com/embed/{video_id}?autoplay={autoplay_param}"
    
    def get_watch_url(self, video_id: str) -> str:
        return f"https://www.youtube.com/watch?v={video_id}"
    
    def search_and_get_url(self, song_name: str, artist: str) -> Optional[dict]:
        query = f"{artist} {song_name}"
        video_id = self.get_youtube_id(query)
        
        if video_id:
            return {
                'video_id': video_id,
                'embed_url': self.get_embed_url(video_id),
                'watch_url': self.get_watch_url(video_id),
                'query': query
            }
        
        return None
    
    def clear_cache(self):
        self.cache = {}
        self.save_cache()
        print("Cache cleared")
    
    def get_cache_stats(self) -> dict:
        return {
            'total_entries': len(self.cache),
            'cache_file': self.cache_file,
            'cache_size_kb': os.path.getsize(self.cache_file) / 1024 if os.path.exists(self.cache_file) else 0
        }

music_player = MusicPlayer()
