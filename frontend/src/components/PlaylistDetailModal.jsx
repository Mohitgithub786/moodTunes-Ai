import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const PlaylistDetailModal = ({ isOpen, onClose, playlist, onUpdate }) => {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: playlist?.name || '',
    description: playlist?.description || '',
    mood: playlist?.mood || ''
  });
  const playerRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const API_URL = API_BASE_URL;

  useEffect(() => {
    if (playlist) {
      setEditForm({
        name: playlist.name || '',
        description: playlist.description || '',
        mood: playlist.mood || ''
      });
      if (playlist.songs) {
        setSongs(playlist.songs);
        // Auto-play first song
        if (playlist.songs.length > 0 && !currentSong) {
          setCurrentSong(playlist.songs[0]);
          setCurrentIndex(0);
        }
      }
    }
  }, [playlist]);

  // Auto-play next song when current ends
  useEffect(() => {
    if (!currentSong || !currentSong.youtube_id) return;

    // Clear any existing interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Start checking video status after 5 seconds (give video time to load)
    const startCheckingTimeout = setTimeout(() => {
      // Check every 2 seconds if video has ended
      checkIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          try {
            // Try to communicate with YouTube iframe
            playerRef.current.contentWindow?.postMessage('{"event":"command","func":"getPlayerState","args":""}', '*');
          } catch (e) {
            // Silently fail if iframe communication fails
          }
        }
      }, 2000);
    }, 5000);

    // Listen for video end events
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        // YouTube player state: 0 = ended
        if (data.info?.playerState === 0) {
          // Video ended, play next
          playNext();
        }
      } catch (e) {
        // Silently fail
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearTimeout(startCheckingTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [currentSong, currentIndex, songs]);

  const handlePlaySong = (song, index) => {
    setCurrentSong(song);
    setCurrentIndex(index);
  };

  const playNext = () => {
    if (currentIndex < songs.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentSong(songs[nextIndex]);
      setCurrentIndex(nextIndex);
    } else {
      // Reached end of playlist - optionally loop back to first song
      // Uncomment below to enable loop
      // setCurrentSong(songs[0]);
      // setCurrentIndex(0);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentSong(songs[prevIndex]);
      setCurrentIndex(prevIndex);
    }
  };

  const handleRemoveSong = async (songId) => {
    if (!confirm('Remove this song from playlist?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/playlists/${playlist.id}/songs/${songId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const updatedSongs = songs.filter(song => song.id !== songId);
      setSongs(updatedSongs);
      
      // If removed song was playing, play next song
      if (currentSong?.id === songId) {
        if (updatedSongs.length > 0) {
          const newIndex = currentIndex >= updatedSongs.length ? updatedSongs.length - 1 : currentIndex;
          setCurrentSong(updatedSongs[newIndex]);
          setCurrentIndex(newIndex);
        } else {
          setCurrentSong(null);
          setCurrentIndex(0);
        }
      } else {
        // Update index if song before current was removed
        const newIndex = updatedSongs.findIndex(s => s.id === currentSong.id);
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
        }
      }
      
      onUpdate();
    } catch (error) {
      console.error('Error removing song:', error);
      alert('Failed to remove song');
    }
  };

  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/playlists/${playlist.id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsEditing(false);
      onUpdate();
      alert('Playlist updated successfully!');
    } catch (error) {
      console.error('Error updating playlist:', error);
      alert('Failed to update playlist');
    }
  };

  const handleBackToPlaylists = () => {
    onClose(); // Close modal to return to playlists page
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      happy: '😊',
      sad: '😢',
      calm: '😌',
      angry: '😠',
      romantic: '❤️',
      energetic: '⚡'
    };
    return moodEmojis[mood?.toLowerCase()] || '🎵';
  };

  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex gap-4 items-start flex-1">
            {/* Back Button */}
            <button
              onClick={handleBackToPlaylists}
              className="flex-shrink-0 w-10 h-10 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg flex items-center justify-center transition-all group"
              title="Back to Playlists"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-slate-700/50 flex-shrink-0">
              <span className="text-3xl">{getMoodEmoji(playlist.mood)}</span>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleUpdatePlaylist} className="flex-1">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-2xl font-bold text-white bg-slate-700/50 rounded-lg px-3 py-2 mb-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-gray-400 bg-slate-700/50 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows="2"
                  placeholder="Add description..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-lg text-sm font-semibold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-700 text-gray-300 px-4 py-1 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">{playlist.name}</h2>
                <p className="text-gray-400 text-sm mb-2">{playlist.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{songs.length} songs</span>
                  {playlist.mood && (
                    <span className="bg-slate-700/50 px-2 py-1 rounded-full text-xs">
                      {playlist.mood}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-purple-400 p-2 rounded-lg hover:bg-slate-700/50 transition-all"
                title="Edit Playlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-all"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* LEFT Side - YouTube Player */}
          <div className="flex-1 bg-slate-800/30 overflow-y-auto">
            <div className="p-6">
              {currentSong ? (
                <div className="space-y-6">
                  {/* YouTube Player */}
                  <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl overflow-hidden border-2 border-purple-500/30">
                    {currentSong.youtube_id ? (
                      <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          key={currentSong.youtube_id}
                          ref={playerRef}
                          className="absolute top-0 left-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
                          title={`${currentSong.name} by ${currentSong.artist}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <p className="text-gray-400">Video not available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player Controls */}
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={playPrevious}
                        disabled={currentIndex === 0}
                        className="p-4 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        title="Previous"
                      >
                        <svg className="w-6 h-6 text-white group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                        </svg>
                      </button>

                      <div className="text-center">
                        <div className="text-white text-lg font-semibold mb-1">
                          Track {currentIndex + 1} of {songs.length}
                        </div>
                        <div className="text-gray-400 text-sm truncate max-w-xs">
                          {currentSong.name}
                        </div>
                      </div>

                      <button
                        onClick={playNext}
                        disabled={currentIndex === songs.length - 1}
                        className="p-4 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                        title="Next"
                      >
                        <svg className="w-6 h-6 text-white group-hover:text-purple-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                        </svg>
                      </button>
                    </div>

                    {/* Auto-play indicator */}
                    {currentIndex < songs.length - 1 && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-purple-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Next: {songs[currentIndex + 1].name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Now Playing Info */}
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                    <h3 className="text-xl font-bold text-white mb-4">Now Playing</h3>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-2xl font-bold text-white truncate mb-1">{currentSong.name}</h4>
                        <p className="text-lg text-gray-400 truncate mb-3">{currentSong.artist}</p>
                        
                        {/* Stats */}
                        <div className="flex flex-wrap gap-4 mt-4">
                          {currentSong.listeners && (
                            <div className="flex items-center text-sm text-gray-400">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              {(currentSong.listeners / 1000000).toFixed(1)}M listeners
                            </div>
                          )}
                          {currentSong.playcount && (
                            <div className="flex items-center text-sm text-gray-400">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              {(currentSong.playcount / 1000000).toFixed(1)}M plays
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {currentSong.tags && currentSong.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {currentSong.tags.slice(0, 5).map((tag, idx) => (
                              <span key={idx} className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <svg className="w-24 h-24 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-400 text-lg">Select a song to start playing</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT Side - Song List */}
          <div className="w-2/5 border-l border-slate-700/50 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                Up Next ({songs.length})
              </h3>

              {songs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-400">No songs in this playlist yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        currentSong?.id === song.id
                          ? 'bg-gradient-to-r from-purple-600/40 to-blue-600/40 border border-purple-500/50'
                          : 'bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/30'
                      }`}
                    >
                      {/* Track Number / Play Icon */}
                      <div 
                        onClick={() => handlePlaySong(song, index)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          currentSong?.id === song.id 
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                            : 'bg-slate-700/50 hover:bg-purple-600/20'
                        } transition-all`}
                      >
                        {currentSong?.id === song.id ? (
                          <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-white font-semibold text-sm">{index + 1}</span>
                        )}
                      </div>

                      {/* Song Info */}
                      <div 
                        onClick={() => handlePlaySong(song, index)}
                        className="flex-1 min-w-0"
                      >
                        <h3 className={`font-semibold truncate transition-colors ${
                          currentSong?.id === song.id ? 'text-white' : 'text-gray-300'
                        }`}>
                          {song.name}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSong(song.id);
                        }}
                        className="flex-shrink-0 bg-slate-600/50 hover:bg-red-600/20 text-gray-400 hover:text-red-400 p-2 rounded-lg transition-all"
                        title="Remove from playlist"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetailModal;
