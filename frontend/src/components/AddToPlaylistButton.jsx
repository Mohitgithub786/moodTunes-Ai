import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AddToPlaylistButton = ({ song, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const { isAuthenticated } = useSelector((state) => state.auth);
  const API_URL = API_BASE_URL;

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchPlaylists();
    }
  }, [isOpen, isAuthenticated]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/playlists/${playlistId}/songs`,
        { song },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Song added to playlist!');
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding song:', error);
      const detail = error.response?.data?.detail || 'Failed to add song to playlist';
      alert(detail);
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create a playlist');
        return;
      }
      
      // Create playlist with the song
      const response = await axios.post(
        `${API_URL}/api/playlists`,
        {
          name: newPlaylistName,
          description: '',
          mood: '',
          songs: [song],
          is_public: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Playlist created and song added!');
      setNewPlaylistName('');
      setShowCreateNew(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      const detail = error.response?.data?.detail || 'Failed to create playlist';
      alert(detail);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          compact
            ? 'p-2 bg-slate-700/50 hover:bg-purple-600/20 text-gray-400 hover:text-purple-400 rounded-lg transition-all'
            : 'bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2'
        }`}
        title="Add to playlist"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {!compact && <span>Add to Playlist</span>}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold">Add to Playlist</h3>
              <p className="text-gray-400 text-sm mt-1 truncate">{song.name}</p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                </div>
              ) : showCreateNew ? (
                <form onSubmit={handleCreateAndAdd} className="p-4">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Playlist name"
                    className="w-full bg-slate-700/50 text-white rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateNew(false)}
                      className="flex-1 bg-slate-700/50 text-gray-300 py-2 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => setShowCreateNew(true)}
                    className="w-full p-3 text-left hover:bg-slate-700/50 transition-all flex items-center gap-3 text-purple-400 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Playlist
                  </button>

                  {playlists.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No playlists yet
                    </div>
                  ) : (
                    playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => handleAddToPlaylist(playlist.id)}
                        className="w-full p-3 text-left hover:bg-slate-700/50 transition-all flex items-center justify-between gap-3 border-t border-slate-700/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{playlist.name}</div>
                          <div className="text-gray-500 text-xs">{playlist.songs?.length || 0} songs</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AddToPlaylistButton;
