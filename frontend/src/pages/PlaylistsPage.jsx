import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { logout } from '../store/authSlice';
import Header from '../components/Header';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import PlaylistCard from '../components/PlaylistCard';
import PlaylistDetailModal from '../components/PlaylistDetailModal';

const PlaylistsPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const API_URL = API_BASE_URL;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchPlaylists();
  }, [isAuthenticated, navigate]);

  const handleAuthError = () => {
    dispatch(logout());
    alert('Your session has expired or is invalid. Please log in again.');
    navigate('/login');
  };

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        handleAuthError();
        return;
      }
      const response = await axios.get(`${API_URL}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      if (error.response?.status === 401) {
        handleAuthError();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (playlistData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleAuthError();
        return;
      }
      await axios.post(`${API_URL}/api/playlists`, playlistData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlaylists();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      if (error.response?.status === 401) {
        handleAuthError();
      } else {
        const detail = error.response?.data?.detail || 'Failed to create playlist. Please try again.';
        alert(detail);
      }
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleAuthError();
        return;
      }
      await axios.delete(`${API_URL}/api/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      if (error.response?.status === 401) {
        handleAuthError();
      } else {
        const detail = error.response?.data?.detail || 'Failed to delete playlist';
        alert(detail);
      }
    }
  };

  const handleViewPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsDetailModalOpen(true);
  };

  const handlePlaylistUpdated = () => {
    fetchPlaylists();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Playlists</h1>
            <p className="text-gray-400">Create and manage your personal music collections</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Playlist
          </button>
        </div>

        {/* Playlists Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-24 h-24 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-400 mb-2">No playlists yet</h3>
            <p className="text-gray-500 mb-6">Create your first playlist to get started</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onView={() => handleViewPlaylist(playlist)}
                onDelete={() => handleDeletePlaylist(playlist.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      {selectedPlaylist && (
        <PlaylistDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPlaylist(null);
          }}
          playlist={selectedPlaylist}
          onUpdate={handlePlaylistUpdated}
        />
      )}
    </div>
  );
};

export default PlaylistsPage;
