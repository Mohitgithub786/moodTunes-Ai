"""
Recommendation Engine - With Fuzzy Artist Matching & Better Error Handling
"""
from typing import List, Optional, Dict
from .config import Config
from .models import Song, PersonalizedRecommendationRequest, RecommendationRequest
from .music_player import music_player
from .mood_detection import MoodDetector
from fastapi import HTTPException
from datetime import datetime
from collections import defaultdict
import re
import urllib.parse


class RecommendationEngine:
    
    LANGUAGE_TO_TAG = {
        'hindi': 'bollywood',
        'english': 'pop'
    }
    
    def __init__(self):
        self.lastfm = Config.get_lastfm()
        self.user_history = defaultdict(list)
        self.user_favorites = defaultdict(list)
        self._track_cache = {}
        self._artist_cache = {}  # Cache for fuzzy-matched artist names
    
    def fuzzy_match_artist(self, artist_query: str) -> str:
            """
            Dynamic fuzzy matching without hardcoding:
            1. Cache check
            2. Last.fm artist search (primary)
            3. Last.fm track search (if artist search fails)
            4. String similarity matching
            """
            if not artist_query or not self.lastfm:
                return artist_query
            
            artist_query = artist_query.strip()
            cache_key = artist_query.lower()
            
            # Check cache
            if cache_key in self._artist_cache:
                cached = self._artist_cache[cache_key]
                print(f"  ✓ Cache: '{artist_query}' → '{cached}'")
                return cached
            
            try:
                # STRATEGY 1: Direct Last.fm artist search
                print(f"  🔍 Searching Last.fm artist: '{artist_query}'")
                search_results = self.lastfm.search_for_artist(artist_query)
                matches = search_results.get_next_page() if hasattr(search_results, 'get_next_page') else list(search_results)
                
                if matches and len(matches) > 0:
                    best_match = matches[0]
                    corrected_name = best_match.name if hasattr(best_match, 'name') else str(best_match)
                    
                    # Cache and return
                    self._artist_cache[cache_key] = corrected_name
                    
                    if corrected_name.lower() != artist_query.lower():
                        print(f"  ✓ Last.fm corrected: '{artist_query}' → '{corrected_name}'")
                    else:
                        print(f"  ✓ Last.fm confirmed: '{corrected_name}'")
                    
                    return corrected_name
                
                # STRATEGY 2: If artist search fails, try track search
                # (sometimes people type artist names that appear in track results)
                print(f"  🔍 Trying track search for: '{artist_query}'")
                track_search = self.lastfm.search_for_track('', artist_query)
                track_matches = track_search.get_next_page() if hasattr(track_search, 'get_next_page') else list(track_search)
                
                if track_matches and len(track_matches) > 0:
                    # Get artist from top track result
                    top_track = track_matches[0]
                    if hasattr(top_track, 'artist'):
                        artist_obj = top_track.artist
                        artist_name = artist_obj.name if hasattr(artist_obj, 'name') else str(artist_obj)
                        
                        # Check if this artist name is similar to query
                        if self._is_similar(artist_query.lower(), artist_name.lower()):
                            self._artist_cache[cache_key] = artist_name
                            print(f"  ✓ Found via track: '{artist_query}' → '{artist_name}'")
                            return artist_name
                
                # STRATEGY 3: Try removing common suffixes/typos
                cleaned_query = self._clean_artist_query(artist_query)
                if cleaned_query != artist_query:
                    print(f"  🔍 Retry with cleaned: '{cleaned_query}'")
                    return self.fuzzy_match_artist(cleaned_query)  # Recursive call
                
            except Exception as e:
                print(f"  ⚠️  Search error for '{artist_query}': {e}")
            
            # FALLBACK: Return original
            print(f"  ℹ️  No match found, using original: '{artist_query}'")
            self._artist_cache[cache_key] = artist_query
            return artist_query
        
    def _is_similar(self, str1: str, str2: str, threshold: float = 0.6) -> bool:
        """Check if two strings are similar using simple ratio"""
        if str1 == str2:
            return True
        
        # Check if one contains the other
        if str1 in str2 or str2 in str1:
            return True
        
        # Simple character overlap ratio
        set1 = set(str1.replace(' ', ''))
        set2 = set(str2.replace(' ', ''))
        
        if not set1 or not set2:
            return False
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        ratio = intersection / union if union > 0 else 0
        return ratio >= threshold
    
    def _clean_artist_query(self, query: str) -> str:
        """
        Clean common typos and suffixes from artist query
        Examples: 
        - "arijit song" → "arijit"
        - "taylor swift songs" → "taylor swift"
        """
        query = query.strip().lower()
        
        # Remove common suffixes
        remove_words = ['song', 'songs', 'singer', 'music', 'artist', 'band']
        
        words = query.split()
        if len(words) > 1 and words[-1] in remove_words:
            cleaned = ' '.join(words[:-1])
            return cleaned
        
        return query
    
    def parse_song_string(self, song_str: str, default_artists: List[str] = None) -> Dict[str, str]:
        """
        Parse song string to extract name and artist
        Formats: "Song - Artist", "Song by Artist", "Song"
        """
        song_str = song_str.strip()
        
        # "Song - Artist"
        if ' - ' in song_str:
            parts = song_str.split(' - ', 1)
            artist_raw = parts[1].strip()
            return {
                'name': parts[0].strip(),
                'artist': self.fuzzy_match_artist(artist_raw)
            }
        
        # "Song by Artist"
        if ' by ' in song_str.lower():
            parts = re.split(r' by ', song_str, flags=re.IGNORECASE, maxsplit=1)
            artist_raw = parts[1].strip()
            return {
                'name': parts[0].strip(),
                'artist': self.fuzzy_match_artist(artist_raw)
            }
        
        # Use default artist
        if default_artists and len(default_artists) > 0:
            return {
                'name': song_str,
                'artist': self.fuzzy_match_artist(default_artists[0])
            }
        
        return {'name': song_str, 'artist': ''}
    
    def track_to_song(self, track_or_info, skip_youtube: bool = False) -> Song:
        """Convert Last.fm track or TopItem to Song without slow blocking HTTP calls"""
        title = ""
        artist_name = ""
        playcount = None
        
        weight = getattr(track_or_info, 'weight', None)
        if weight is None and isinstance(track_or_info, (list, tuple)) and len(track_or_info) > 1:
            weight = track_or_info[1]
            track = track_or_info[0]
        elif hasattr(track_or_info, 'item'):
            track = track_or_info.item
        else:
            track = track_or_info
        
        try:
            title = track.title if hasattr(track, 'title') else str(track)
        except Exception:
            title = str(track)
        
        try:
            if hasattr(track, 'artist'):
                artist_obj = track.artist
                artist_name = artist_obj.name if hasattr(artist_obj, 'name') else str(artist_obj)
        except Exception:
            artist_name = ""
        
        if artist_name and title:
            url = f"https://www.last.fm/music/{urllib.parse.quote(artist_name)}/_/{urllib.parse.quote(title)}"
        else:
            url = None
        
        if weight is not None:
            try:
                playcount = int(weight)
            except Exception:
                playcount = None
        
        youtube_id = None
        if not skip_youtube and title and artist_name:
            try:
                youtube_id = music_player.get_youtube_id(f"{artist_name} {title}")
            except Exception:
                youtube_id = None
        
        song_id = f"{artist_name}_{title}".replace(" ", "_").lower()[:50]
        
        return Song(
            id=song_id,
            name=title,
            artist=artist_name,
            lastfm_url=url,
            youtube_id=youtube_id,
            preview_url=f"https://www.youtube.com/watch?v={youtube_id}" if youtube_id else None,
            album=None,
            duration_ms=None,
            listeners=None,
            playcount=playcount,
            tags=[],
            audio_features={}
        )
    
    def get_top_tracks_by_tag(self, tag: str, limit: int = 20) -> List[Song]:
        """Get top tracks by tag"""
        songs = []
        if not self.lastfm:
            return songs
        
        try:
            tag_obj = self.lastfm.get_tag(tag)
            top_tracks = tag_obj.get_top_tracks(limit=limit)
            
            for track_info in top_tracks:
                try:
                    song = self.track_to_song(track_info, skip_youtube=True)
                    if song and song.name:
                        songs.append(song)
                except Exception:
                    continue
        except Exception as e:
            print(f"Error for tag '{tag}': {e}")
        
        return songs
    
    def get_artist_top_tracks(self, artist_name: str, limit: int = 10, mood_filter: Optional[str] = None) -> List[Song]:
        """Get artist's top tracks with fuzzy matching"""
        songs = []
        if not self.lastfm:
            return songs
        
        corrected_artist = self.fuzzy_match_artist(artist_name)
        
        try:
            print(f"  🎤 Fetching tracks for: {corrected_artist}")
            if mood_filter:
                print(f"     🎭 Filtering by mood: {mood_filter}")
            
            artist = self.lastfm.get_artist(corrected_artist)
            fetch_limit = limit * 2 if mood_filter else limit
            top_tracks = artist.get_top_tracks(limit=fetch_limit)
            
            for track_info in top_tracks:
                if len(songs) >= limit:
                    break
                    
                try:
                    song = self.track_to_song(track_info, skip_youtube=True)
                    if song and song.name:
                        songs.append(song)
                        print(f"     ✓ Added: {song.name} by {song.artist}")
                except Exception as e:
                    print(f"     ✗ Error converting track: {e}")
                    continue
            
            print(f"  ✓ Got {len(songs)} tracks from {corrected_artist}" + (f" (mood-filtered: {mood_filter})" if mood_filter else ""))
        except Exception as e:
            print(f"  ✗ Error getting tracks for {corrected_artist}: {e}")
        
        return songs
    
    def search_by_artist(self, artist_name: str, limit: int = 10, mood_filter: Optional[str] = None) -> List[Song]:
        """Search songs by artist with fuzzy matching"""
        if not self.lastfm:
            return []
        
        corrected_artist = self.fuzzy_match_artist(artist_name)
        print(f"🎤 Searching for artist: {corrected_artist}")
        if mood_filter:
            print(f"   🎭 With mood filter: {mood_filter}")
        
        songs = self.get_artist_top_tracks(corrected_artist, limit=limit, mood_filter=mood_filter)
        
        for song in songs:
            if not song.youtube_id and song.name and song.artist:
                try:
                    youtube_id = music_player.get_youtube_id(f"{song.artist} {song.name}")
                    if youtube_id:
                        song.youtube_id = youtube_id
                        song.preview_url = f"https://www.youtube.com/watch?v={youtube_id}"
                except Exception:
                    pass
        
        return songs
    
    def search_track(self, name: str, artist: Optional[str] = None) -> Optional[Song]:
        """Search track with fuzzy artist matching and YouTube ID guarantee"""
        if not self.lastfm:
            return None
        
        try:
            # Apply fuzzy matching to artist
            corrected_artist = self.fuzzy_match_artist(artist) if artist else None
            
            cache_key = f"{corrected_artist}_{name}".lower() if corrected_artist else name.lower()
            
            if cache_key in self._track_cache:
                cached_song = self._track_cache[cache_key]
                if cached_song.youtube_id:
                    print(f"✓ Cache hit: {name} by {corrected_artist}")
                    return cached_song
                else:
                    print(f"⚠️  Cache hit but no YouTube ID, re-fetching...")
            
            print(f"🔍 Searching: {name}" + (f" by {corrected_artist}" if corrected_artist else ""))
            
            # Try direct lookup
            if corrected_artist:
                try:
                    track = self.lastfm.get_track(corrected_artist, name)
                    song = self.track_to_song(track, skip_youtube=False)
                    
                    if not song.youtube_id:
                        print(f"  ⚠️  No YouTube ID, fetching manually...")
                        youtube_id = music_player.get_youtube_id(f"{corrected_artist} {name}")
                        if youtube_id:
                            song.youtube_id = youtube_id
                            song.preview_url = f"https://www.youtube.com/watch?v={youtube_id}"
                            print(f"  ✓ YouTube ID added: {youtube_id}")
                    
                    self._track_cache[cache_key] = song
                    print(f"✓ Found: {song.name} by {song.artist}")
                    return song
                except Exception as e:
                    print(f"  Direct lookup failed: {e}")
            
            # Fallback search
            search_results = self.lastfm.search_for_track(corrected_artist or '', name)
            matches = search_results.get_next_page() if hasattr(search_results, 'get_next_page') else list(search_results)
            
            if matches:
                first_match = matches[0]
                song = self.track_to_song(first_match, skip_youtube=False)
                
                if not song.youtube_id:
                    search_query = f"{song.artist} {song.name}" if song.artist else song.name
                    youtube_id = music_player.get_youtube_id(search_query)
                    if youtube_id:
                        song.youtube_id = youtube_id
                        song.preview_url = f"https://www.youtube.com/watch?v={youtube_id}"
                
                self._track_cache[cache_key] = song
                print(f"✓ Found via search: {song.name} by {song.artist}")
                return song
            
            print(f"✗ No results for: {name}")
            return None
            
        except Exception as e:
            print(f"✗ Error searching '{name}': {e}")
            return None
    
    def get_similar_tracks(self, track_name: str, artist: str, limit: int = 5, mood_filter: Optional[str] = None) -> List[Song]:
        """Get similar tracks with fuzzy artist matching"""
        if not self.lastfm:
            return []
        
        corrected_artist = self.fuzzy_match_artist(artist)
        
        songs = []
        try:
            print(f"  🔍 Finding similar to: '{track_name}' by {corrected_artist}")
            track = self.lastfm.get_track(corrected_artist, track_name)
            similar = track.get_similar(limit=limit)
            
            for similar_track in similar:
                if len(songs) >= limit:
                    break
                    
                try:
                    song = self.track_to_song(similar_track, skip_youtube=True)
                    if song and song.name:
                        songs.append(song)
                        print(f"     ✓ Similar: {song.name}")
                except Exception:
                    continue
                    
            print(f"  ✓ Found {len(songs)} similar tracks")
        except Exception as e:
            print(f"  ✗ Error getting similar tracks: {e}")
        
        return songs
    
    def add_favorite_song(self, user_id: str, song_name: str, artist: str) -> Dict:
        """Add song to favorites"""
        favorite = {
            'name': song_name,
            'artist': artist,
            'added_at': datetime.now().isoformat()
        }
        
        existing = [f for f in self.user_favorites[user_id] 
                   if f['name'].lower() == song_name.lower() 
                   and f['artist'].lower() == artist.lower()]
        
        if not existing:
            self.user_favorites[user_id].append(favorite)
            return {"message": "Added to favorites", "favorite": favorite}
        else:
            return {"message": "Already in favorites", "favorite": existing[0]}
    
    def get_favorites(self, user_id: str) -> Dict:
        """Get user favorites"""
        favorites = self.user_favorites[user_id]
        return {"user_id": user_id, "total": len(favorites), "favorites": favorites}
    
    def remove_favorite(self, user_id: str, song_name: str, artist: str) -> Dict:
        """Remove from favorites"""
        original_count = len(self.user_favorites[user_id])
        self.user_favorites[user_id] = [
            f for f in self.user_favorites[user_id]
            if not (f['name'].lower() == song_name.lower() 
                   and f['artist'].lower() == artist.lower())
        ]
        
        removed = original_count > len(self.user_favorites[user_id])
        return {"removed": removed, "remaining": len(self.user_favorites[user_id])}
    
    def get_user_history(self, user_id: str, limit: int = 50) -> Dict:
        """Get listening history"""
        history = self.user_history[user_id][-limit:]
        return {
            "user_id": user_id,
            "total_songs": len(self.user_history[user_id]),
            "history": history
        }
    
    def get_personalized_recommendations(self, request: PersonalizedRecommendationRequest) -> Dict:
        """
        Personalized recommendations with FUZZY MATCHING:
        - 8: Artist + Mood + Language
        - 4: Language + Mood
        - 4: Similar + Mood
        - Rest: Fallback
        """
        if not self.lastfm:
            raise HTTPException(status_code=503, detail="Last.fm not configured")
        
        mood = (request.mood or '').lower()
        if not MoodDetector.validate_mood(mood):
            raise HTTPException(status_code=400, detail=f"Invalid mood: {mood}")
        
        prefs = request.preferences or {}
        
        language = (prefs.get('language') or '').lower()
        if language not in ['hindi', 'english']:
            print(f"⚠️  Invalid language '{language}', defaulting to 'english'")
            language = 'english'
        
        favorite_songs = (
            prefs.get('favoriteSongs') or 
            prefs.get('favorite_songs') or 
            prefs.get('favouriteSongs') or 
            []
        )
        
        favorite_singers = (
            prefs.get('favoriteSingers') or 
            prefs.get('favorite_artists') or 
            prefs.get('favorite_singers') or
            prefs.get('favouriteSingers') or
            []
        )
        
        if isinstance(favorite_songs, str):
            favorite_songs = [s.strip() for s in favorite_songs.split(',') if s.strip()]
        if isinstance(favorite_singers, str):
            favorite_singers = [s.strip() for s in favorite_singers.split(',') if s.strip()]
        
        # FUZZY MATCH ALL ARTISTS
        corrected_singers = []
        for singer in favorite_singers:
            corrected = self.fuzzy_match_artist(singer)
            if corrected:
                corrected_singers.append(corrected)
        
        print(f"\n{'='*60}")
        print(f"🎵 PERSONALIZED RECOMMENDATIONS")
        print(f"{'='*60}")
        print(f"Language: {language.upper()}")
        print(f"Mood: {mood.upper()}")
        print(f"Favorite Singers (original): {favorite_singers}")
        print(f"Favorite Singers (corrected): {corrected_singers}")
        print(f"Favorite Songs: {favorite_songs}")
        print(f"Target: {request.limit} songs")
        print(f"{'='*60}\n")
        
        all_songs = []
        added = set()
        
        mood_tags = MoodDetector.get_mood_tags(mood)
        language_tag = self.LANGUAGE_TO_TAG.get(language, 'pop')
        
        print(f"🏷️  Tags - Language: '{language_tag}', Mood: {mood_tags}\n")
        
        cat1_count = 0
        cat2_count = 0
        cat3_count = 0
        cat4_count = 0
        
        TARGET_CAT1 = 8
        TARGET_CAT2 = 4
        TARGET_CAT3 = 4
        
        # CATEGORY 1: Artist + Mood + Language
        if corrected_singers:
            print(f"📌 CATEGORY 1: Getting {TARGET_CAT1} songs (Artist + Mood + Language)")
            songs_per_artist = max(3, TARGET_CAT1 // len(corrected_singers[:3]))
            
            for singer in corrected_singers[:3]:
                if cat1_count >= TARGET_CAT1:
                    break
                    
                print(f"  🎤 Artist: {singer}")
                artist_songs = self.get_artist_top_tracks(
                    singer, 
                    limit=songs_per_artist * 2,
                    mood_filter=mood
                )
                
                for song in artist_songs:
                    if cat1_count >= TARGET_CAT1:
                        break
                    key = f"{song.name}-{song.artist}".lower()
                    if key not in added:
                        added.add(key)
                        all_songs.append(song)
                        cat1_count += 1
                        print(f"     ✓ Added: {song.name}")
            
            print(f"  ✅ Category 1: {cat1_count}/{TARGET_CAT1} songs\n")
        else:
            print(f"⏭️  CATEGORY 1: Skipped (no artists)\n")
        
        # CATEGORY 2: Language + Mood
        print(f"📌 CATEGORY 2: Getting {TARGET_CAT2} songs (Language + Mood)")
        
        combined_pool = []
        lang_songs = self.get_top_tracks_by_tag(language_tag, limit=20)
        combined_pool.extend(lang_songs)
        print(f"  🌍 Retrieved {len(lang_songs)} {language} songs")
        
        if mood_tags:
            for mood_tag in mood_tags[:2]:
                mood_songs = self.get_top_tracks_by_tag(mood_tag, limit=15)
                combined_pool.extend(mood_songs)
                print(f"  😊 Retrieved {len(mood_songs)} for '{mood_tag}'")
        
        for song in combined_pool:
            if cat2_count >= TARGET_CAT2:
                break
            key = f"{song.name}-{song.artist}".lower()
            if key not in added:
                added.add(key)
                all_songs.append(song)
                cat2_count += 1
        
        print(f"  ✅ Category 2: {cat2_count}/{TARGET_CAT2} songs\n")
        
        # CATEGORY 3: Similar + Mood
        if favorite_songs:
            print(f"📌 CATEGORY 3: Getting {TARGET_CAT3} songs (Similar + Mood)")
            songs_per_favorite = max(2, TARGET_CAT3 // len(favorite_songs[:3]))
            
            for fav_song in favorite_songs[:3]:
                if cat3_count >= TARGET_CAT3:
                    break
                
                # Parse with fuzzy matching
                parsed = self.parse_song_string(fav_song, corrected_singers)
                song_name = parsed['name']
                artist_name = parsed['artist']
                
                if not artist_name:
                    print(f"  ⚠️  Skipping '{song_name}' - no artist")
                    continue
                
                print(f"  ❤️  Finding similar to: '{song_name}' by {artist_name}")
                similar_songs = self.get_similar_tracks(
                    song_name, 
                    artist_name, 
                    limit=songs_per_favorite * 2,
                    mood_filter=mood
                )
                
                for song in similar_songs:
                    if cat3_count >= TARGET_CAT3:
                        break
                    key = f"{song.name}-{song.artist}".lower()
                    if key not in added:
                        added.add(key)
                        all_songs.append(song)
                        cat3_count += 1
                        print(f"     ✓ Added: {song.name}")
            
            print(f"  ✅ Category 3: {cat3_count}/{TARGET_CAT3} songs\n")
        else:
            print(f"⏭️  CATEGORY 3: Skipped (no favorite songs)\n")
        
        # CATEGORY 4: Fallback
        remaining = request.limit - len(all_songs)
        
        if remaining > 0:
            print(f"📌 CATEGORY 4: FALLBACK - Need {remaining} more")
            
            fallback_pool = []
            lang_fallback = self.get_top_tracks_by_tag(language_tag, limit=remaining * 3)
            fallback_pool.extend(lang_fallback)
            print(f"  🌍 Retrieved {len(lang_fallback)} {language} songs")
            
            if mood_tags:
                for mood_tag in mood_tags:
                    mood_fallback = self.get_top_tracks_by_tag(mood_tag, limit=remaining * 2)
                    fallback_pool.extend(mood_fallback)
                    print(f"  😊 Retrieved {len(mood_fallback)} for '{mood_tag}'")
            
            for song in fallback_pool:
                if len(all_songs) >= request.limit:
                    break
                key = f"{song.name}-{song.artist}".lower()
                if key not in added:
                    added.add(key)
                    all_songs.append(song)
                    cat4_count += 1
            
            print(f"  ✅ Category 4: {cat4_count}/{remaining} songs\n")
        
        all_songs.sort(key=lambda x: (x.playcount or 0), reverse=True)
        final = all_songs[:request.limit]
        
        print(f"\n{'='*60}")
        print(f"✅ FINAL DISTRIBUTION")
        print(f"{'='*60}")
        print(f"Total: {len(final)}/{request.limit}")
        print(f"├─ Cat 1 (Artist+Mood+Lang): {cat1_count}")
        print(f"├─ Cat 2 (Language+Mood): {cat2_count}")
        print(f"├─ Cat 3 (Similar+Mood): {cat3_count}")
        print(f"└─ Cat 4 (Fallback): {cat4_count}")
        print(f"{'='*60}\n")
        
        print("🎬 Fetching YouTube IDs...")
        youtube_success = 0
        for i, song in enumerate(final, 1):
            if not song.youtube_id and song.name and song.artist:
                try:
                    youtube_id = music_player.get_youtube_id(f"{song.artist} {song.name}")
                    if youtube_id:
                        song.youtube_id = youtube_id
                        song.preview_url = f"https://www.youtube.com/watch?v={youtube_id}"
                        youtube_success += 1
                except Exception:
                    pass
            if i % 5 == 0:
                print(f"   Processed {i}/{len(final)}...")
        
        print(f"✅ YouTube IDs: {youtube_success}/{len(final)}\n")
        
        for s in final:
            try:
                self.user_history[request.user_id].append({
                    'song': s.dict() if hasattr(s, 'dict') else s.__dict__,
                    'mood': mood,
                    'language': language,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'personalized'
                })
            except Exception:
                # Best-effort: store minimal info
                self.user_history[request.user_id].append({
                    'song': {'name': getattr(s, 'name', None), 'artist': getattr(s, 'artist', None)},
                    'mood': mood,
                    'language': language,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'personalized'
                })
        
        return {
            "songs": final,
            "mood": mood,
            "language": language,
            "total": len(final),
            "distribution": {
                "artist_based": cat1_count,
                "language_mood": cat2_count,
                "similar_tracks": cat3_count,
                "fallback": cat4_count
            },
            "preferences_applied": {
                "language": language,
                "favorite_singers": corrected_singers,
                "favorite_songs_count": len(favorite_songs)
            }
        }
    
    def get_basic_recommendations(self, request: RecommendationRequest) -> Dict:
        """Basic mood-based recommendations"""
        if not self.lastfm:
            raise HTTPException(status_code=503, detail="Last.fm not configured")
        
        mood = (request.mood or '').lower()
        if not MoodDetector.validate_mood(mood):
            raise HTTPException(status_code=400, detail=f"Invalid mood: {mood}")
        mood_tags = MoodDetector.get_mood_tags(mood)
        recommendations = []
        added = set()
        
        print(f"\n🎵 Basic Recommendations for mood: {mood}")
        print(f"Tags: {mood_tags}\n")
        
        for tag in mood_tags:
            if len(recommendations) >= request.limit:
                break
            
            songs = self.get_top_tracks_by_tag(tag, limit=15)
            for s in songs:
                key = f"{s.name}-{s.artist}".lower()
                if key not in added and len(recommendations) < request.limit:
                    added.add(key)
                    recommendations.append(s)
        
        for song in recommendations:
            if not song.youtube_id and song.name and song.artist:
                try:
                    youtube_id = music_player.get_youtube_id(f"{song.artist} {song.name}")
                    if youtube_id:
                        song.youtube_id = youtube_id
                        song.preview_url = f"https://www.youtube.com/watch?v={youtube_id}"
                except Exception:
                    pass
        
        print(f"✅ Retrieved {len(recommendations)} songs\n")
        
        return {
            "songs": recommendations,
            "mood": mood,
            "total": len(recommendations)
        }
    
    def search_music(self, query: str, limit: int = 10) -> List[Song]:
        """Direct YouTube search - fast and no Last.fm dependency"""
        results = []
        try:
            print(f"\n🔍 Direct YouTube Search: '{query}'")
            
            # Search YouTube directly
            youtube = Config.get_youtube()
            if not youtube:
                print("❌ YouTube API not configured")
                raise HTTPException(status_code=503, detail="YouTube API not configured")
            
            try:
                search_response = youtube.search().list(
                    q=query,
                    part='snippet',
                    type='video',
                    videoCategoryId='10',  # Music category
                    maxResults=min(limit, 10)
                ).execute()
            except Exception as api_error:
                print(f"❌ YouTube API error: {api_error}")
                # Fallback to simple search without category filter
                try:
                    search_response = youtube.search().list(
                        q=f"{query} song",
                        part='snippet',
                        type='video',
                        maxResults=min(limit, 10)
                    ).execute()
                except Exception as e:
                    print(f"❌ YouTube fallback failed: {e}")
                    raise HTTPException(status_code=500, detail=f"YouTube search failed: {str(e)}")
            
            items = search_response.get('items', [])
            print(f"  Found {len(items)} videos from YouTube")
            
            for i, item in enumerate(items, 1):
                try:
                    video_id = item['id']['videoId']
                    snippet = item['snippet']
                    title = snippet.get('title', 'Unknown')
                    channel = snippet.get('channelTitle', 'Unknown Artist')
                    
                    # Try to extract artist and song name
                    if ' - ' in title:
                        parts = title.split(' - ', 1)
                        artist = parts[0].strip()
                        song_name = parts[1].strip()
                    elif '|' in title:
                        parts = title.split('|', 1)
                        artist = parts[0].strip()
                        song_name = parts[1].strip()
                    else:
                        artist = channel
                        song_name = title
                    
                    # Clean up common suffixes
                    for suffix in ['(Official Video)', '(Official Music Video)', '(Lyric Video)', 
                                   '(Audio)', '[Official Video]', 'Official Video', 'Lyrics']:
                        song_name = song_name.replace(suffix, '').strip()
                    
                    song = Song(
                        id=f"yt_{video_id}",
                        name=song_name[:100],  # Limit length
                        artist=artist[:100],
                        youtube_id=video_id,
                        preview_url=f"https://www.youtube.com/watch?v={video_id}",
                        lastfm_url=None,
                        album=None,
                        duration_ms=None,
                        listeners=None,
                        playcount=None,
                        tags=[],
                        audio_features={}
                    )
                    
                    results.append(song)
                    print(f"  [{i}] ✓ {song.name} by {song.artist}")
                    
                except Exception as e:
                    print(f"  [{i}] ✗ Error processing item: {e}")
                    continue
            
            print(f"\n✅ Found {len(results)} results (instant!)\n")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ YouTube search error: {e}\n")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
        
        return results

# Global instance
recommendation_engine = RecommendationEngine()
