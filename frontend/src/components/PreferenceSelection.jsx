import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const MusicPreferences = ({ mood, onPreferencesSet }) => {
  const [language, setLanguage] = useState('');
  const [favoriteSongs, setFavoriteSongs] = useState('');
  const [favoriteArtists, setFavoriteArtists] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState({});

  const languages = ['Hindi', 'English'];
  
  const BACKEND_URL = API_BASE_URL;
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
  
    setIsSearching(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/search-music`, {
        params: { query: searchQuery }
      });
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = () => {
    const newErrors = {};
    
    // Validate language is mandatory
    if (!language) {
      newErrors.language = 'Language is mandatory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // FIXED: Send correct field names matching backend expectations
    const preferences = {
      mood: mood.mood || mood,
      language: language.toLowerCase(), // Convert to lowercase for backend
      favoriteSongs: favoriteSongs.split(',').map(s => s.trim()).filter(s => s),
      favoriteSingers: favoriteArtists.split(',').map(a => a.trim()).filter(a => a),
      searchQuery: searchQuery || '',
      user_id: 'default'
    };

    console.log('Sending preferences:', preferences);
    onPreferencesSet(preferences);
  };

  const handlePlayFromSearch = (song) => {
    // Add to favorites when clicked
    setFavoriteSongs(prev => prev ? `${prev}, ${song.name}` : song.name);
    setFavoriteArtists(prev => {
      const artists = prev.split(',').map(a => a.trim()).filter(a => a);
      if (!artists.includes(song.artist)) {
        return prev ? `${prev}, ${song.artist}` : song.artist;
      }
      return prev;
    });
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Customize Your Experience</h2>
          <p className="text-gray-400 text-lg">
            Mood: <span className="text-purple-400 font-semibold capitalize">{mood.mood || mood}</span>
          </p>
          <p className="text-gray-500 text-sm mt-2">Tell us your preferences for personalized recommendations</p>
        </div>

        {/* Distribution Info */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4 mb-8">
          <h3 className="text-white font-semibold mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How We Personalize Your Playlist (20 songs)
          </h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong className="text-purple-400">8 songs</strong> - From your favorite artists matching your mood and language</li>
            <li>• <strong className="text-pink-400">5-6 songs</strong> - Based on your language preference and mood</li>
            <li>• <strong className="text-blue-400">6-7 songs</strong> - Similar to your favorite songs</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Preferences */}
          <div className="space-y-6">
            
            {/* Language Selection - MANDATORY */}
            <div>
              <label className="block text-white font-semibold mb-3 flex items-center">
                <span className="text-red-500 mr-1">*</span>
                Language
                <span className="ml-2 text-xs text-gray-400">(Required)</span>
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setErrors(prev => ({ ...prev, language: '' }));
                }}
                className={`w-full bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border ${
                  errors.language ? 'border-red-500' : 'border-white/10'
                }`}
              >
                <option value="">Select Language</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              {errors.language && (
                <p className="text-red-400 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.language}
                </p>
              )}
            </div>

            {/* Favorite Songs */}
            <div>
              <label className="block text-white font-semibold mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Favorite Songs
                <span className="ml-2 text-xs text-gray-400">(Optional - comma separated)</span>
              </label>
              <textarea
                value={favoriteSongs}
                onChange={(e) => setFavoriteSongs(e.target.value)}
                placeholder="E.g., Tum Hi Ho, Kesariya, Ranjha"
                rows="3"
                className="w-full bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 resize-none"
              />
              <p className="text-gray-500 text-xs mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                We'll find songs similar to these
              </p>
            </div>

            {/* Favorite Artists */}
            <div>
              <label className="block text-white font-semibold mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Favorite Artists/Singers
                <span className="ml-2 text-xs text-gray-400">(Optional - comma separated)</span>
              </label>
              <textarea
                value={favoriteArtists}
                onChange={(e) => setFavoriteArtists(e.target.value)}
                placeholder="E.g., Arijit Singh, AR Rahman, Diljit Dosanjh"
                rows="3"
                className="w-full bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/10 resize-none"
              />
              <p className="text-gray-500 text-xs mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Get top tracks from your favorite artists
              </p>
            </div>

          </div>

          {/* Right Column - Search */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Search Music</h3>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Search and click to add to your favorites!
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="E.g., Tum Hi Ho or Arijit Singh"
                  className="flex-1 bg-gray-800/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-6 py-3 rounded-xl transition transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Search'}
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((song, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/30 hover:bg-gray-700/50 border border-white/10 rounded-xl p-4 transition-all cursor-pointer group"
                        onClick={() => handlePlayFromSearch(song)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate group-hover:text-purple-400 transition flex items-center">
                              <svg className="w-4 h-4 mr-2 opacity-0 group-hover:opacity-100 transition" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              {song.name}
                            </h4>
                            <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                          </div>
                          <div className="ml-2 opacity-0 group-hover:opacity-100 transition">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-gray-500">Search for songs to add to favorites</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-[1.02] shadow-2xl text-lg flex items-center justify-center"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Get Personalized Recommendations
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { 
          animation: fadeIn 0.8s ease-out; 
        }
        .custom-scrollbar::-webkit-scrollbar { 
          width: 6px; 
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
};

export default MusicPreferences;