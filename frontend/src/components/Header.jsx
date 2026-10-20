import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'
import axios from 'axios'
import { API_BASE_URL } from '../config/api'

const Header = ({ onPlaySong }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  const BACKEND_URL = API_BASE_URL

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await axios.get(`${BACKEND_URL}/search-music`, {
        params: { query: searchQuery, limit: 10 }
      })
      setSearchResults(response.data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handlePlaySong = (song) => {
    // Store song in localStorage for player
    const existingRecommendations = localStorage.getItem('recommendations');
    let recommendations = [];
    
    try {
      recommendations = existingRecommendations ? JSON.parse(existingRecommendations) : [];
    } catch (e) {
      recommendations = [];
    }

    // Add song to beginning if not already there
    if (!recommendations.find(s => s.id === song.id)) {
      recommendations = [song, ...recommendations];
    } else {
      // Move to front
      recommendations = [song, ...recommendations.filter(s => s.id !== song.id)];
    }

    localStorage.setItem('recommendations', JSON.stringify(recommendations));
    
    // Close search modal
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // Navigate to player page
    navigate('/player');
    
    // Also call parent handler if provided
    if (onPlaySong) onPlaySong(song);
  }

  return (
    <>
      <header className="glass-strong sticky top-0 z-50 backdrop-blur-lg bg-white/5 border-b border-white/10">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Left - Logo */}
            <div className="flex items-center space-x-4 animate-fadeIn">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
                <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  MoodTunes AI
                </h1>
                <p className="text-xs text-gray-400 font-medium">Feel the Music, Match Your Mood</p>
              </div>
            </div>

            {/* Right - Navigation + Auth + Search */}
            <div className="flex items-center space-x-3">
              {/* Home Button (visible on playlists page) */}
              <button
                onClick={() => navigate('/')}
                className="glass px-4 py-2 rounded-full text-white hover:bg-white/10 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span className="hidden md:inline">Home</span>
              </button>

              {/* Playlists Link */}
              <button
                onClick={() => navigate('/playlists')}
                className="glass px-4 py-2 rounded-full text-white hover:bg-white/10 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                </svg>
                <span className="hidden md:inline">Playlists</span>
              </button>
              
              {/* Search Button */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="glass px-4 py-2 rounded-full text-white hover:bg-white/10 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span className="hidden md:inline">Search</span>
              </button>

              {/* Auth Buttons */}
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate('/login')}
                  className="glass px-6 py-2 rounded-full text-white hover:bg-purple-500/20 transition font-semibold flex items-center gap-2 border border-purple-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                  Login
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="glass px-5 py-2 rounded-full text-white hover:bg-purple-500/20 transition font-semibold flex items-center gap-2 border border-purple-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Logout
                </button>
              )}

              {/* Animated Waves */}
              <div className="hidden md:flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-wave"
                    style={{ height: '20px', animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes wave {
            0%, 100% { height: 15px; }
            50% { height: 35px; }
          }
          .animate-wave { animation: wave 1s ease-in-out infinite; }
          .animate-fadeIn { animation: fadeIn 0.8s ease-out; }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </header>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Search Music
              </h2>
              <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by song name or artist..."
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition font-semibold disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 max-h-96 overflow-y-auto custom-scrollbar">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((song, index) => (
                    <div
                      key={index}
                      onClick={() => handlePlaySong(song)}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-semibold group-hover:text-purple-400 transition">{song.name}</p>
                          <p className="text-gray-400 text-sm">{song.artist}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p>No results found</p>
                </div>
              ) : !searchQuery && !isSearching && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2zM9 10l12-3"/>
                  </svg>
                  <p>Search for any song or artist</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.5); border-radius: 10px; }
      `}</style>
    </>
  )
}

export default Header
