import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const Recommendations = ({ mood, preferences, onRecommendations, onError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const isMountedRef = useRef(true);

  const fetchRecommendations = useCallback(async () => {
    if (!mood || !preferences) return;

    setLoading(true);
    setError(null);
    setProgress(15);
    setStage('Analyzing your mood...');

    const stages = [
      { progress: 30, text: 'Searching music database...' },
      { progress: 55, text: 'Finding perfect matches...' },
      { progress: 75, text: 'Curating your playlist...' },
      { progress: 90, text: 'Almost ready...' }
    ];

    let currentStage = 0;
    const stageInterval = setInterval(() => {
      if (!isMountedRef.current) return;
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setStage(stages[currentStage].text);
        currentStage++;
      }
    }, 900);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/personalized-recommendations`,
        {
          mood: mood.mood || mood,
          user_id: 'default',
          limit: 20,
          preferences: {
            language: preferences.language,
            favorite_songs: preferences.favoriteSongs || [],
            favorite_singers: preferences.favoriteSingers || [],
            search_query: preferences.searchQuery || ''
          }
        }
      );

      clearInterval(stageInterval);
      if (!isMountedRef.current) return;

      setProgress(100);
      setStage('Complete!');
      setTimeout(() => {
        if (isMountedRef.current && onRecommendations) {
          onRecommendations(response.data.songs || []);
        }
      }, 300);
    } catch (err) {
      clearInterval(stageInterval);
      if (!isMountedRef.current) return;
      if (axios.isCancel && axios.isCancel(err)) return;
      const message = err.response?.data?.detail || err.message || 'Failed to fetch recommendations';
      setError(message);
      if (onError) onError(message);
      console.error('Error fetching recommendations:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [mood, preferences, onRecommendations, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRecommendations();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchRecommendations]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <div className="relative bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-purple-900/30 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-12 shadow-2xl overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="relative z-10">
            {/* Main Content */}
            <div className="flex flex-col items-center justify-center py-12">
              {/* Animated Music Icon */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-50 animate-ping"></div>
                <div className="relative w-32 h-32 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-4xl font-black text-white mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Magic in Progress
              </h3>
              <p className="text-gray-300 text-lg text-center max-w-md mb-8">
                Our AI is crafting the perfect playlist just for you
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md mb-8">
                <div className="bg-gray-800/50 rounded-full h-4 overflow-hidden border border-purple-500/30 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-purple-400 text-sm font-semibold">{stage}</p>
                  <p className="text-pink-400 text-sm font-bold">{progress}%</p>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎭</span>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300">Mood</p>
                      <p className="text-white font-bold capitalize">{mood.mood || mood}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🌍</span>
                    </div>
                    <div>
                      <p className="text-xs text-pink-300">Language</p>
                      <p className="text-white font-bold capitalize">{preferences.language}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎵</span>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">Songs</p>
                      <p className="text-white font-bold">20 Tracks</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fun Facts */}
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-6 max-w-2xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">💡</div>
                  <div>
                    <p className="text-purple-300 font-semibold mb-2">Did you know?</p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Our AI analyzes over 4 categories including artist preferences, mood tags, and similar songs to create your perfect playlist. Each recommendation is uniquely tailored to your taste!
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading Animation */}
              <div className="mt-8 flex space-x-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-500/50"></div>
                <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce shadow-lg shadow-pink-500/50" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-500/50" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stay Here Message */}
        <div className="mt-6 text-center animate-pulse">
          <div className="inline-flex items-center gap-3 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-6 py-3 rounded-xl backdrop-blur-sm">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Please wait! Your perfect playlist is being crafted...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="bg-gradient-to-br from-red-900/30 via-pink-900/30 to-red-900/30 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 shadow-2xl">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-3xl font-black text-white mb-3">Oops! Something Went Wrong</h3>
            <p className="text-red-300 mb-8 text-lg">{error}</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => fetchRecommendations()}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold px-8 py-4 rounded-xl transition transform hover:scale-105 shadow-2xl shadow-red-500/50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/preferences'}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-8 py-4 rounded-xl transition transform hover:scale-105 shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Recommendations;
