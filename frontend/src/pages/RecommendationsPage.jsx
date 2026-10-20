import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Particles from '../components/Particles';
import Recommendations from '../components/Recommendations';
import Chatbot from '../components/Chatbot';

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const [mood, setMood] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handlePlaySong = (song) => {
    localStorage.setItem('recommendations', JSON.stringify([song]));
    navigate('/player');
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist?.songs?.length > 0) {
      localStorage.setItem('recommendations', JSON.stringify(playlist.songs));
      navigate('/player');
    }
  };

  useEffect(() => {
    const storedMood = localStorage.getItem('selectedMood');
    const storedPreferences = localStorage.getItem('userPreferences');

    if (storedMood && storedPreferences) {
      setMood(JSON.parse(storedMood));
      setPreferences(JSON.parse(storedPreferences));
    } else {
      navigate('/mood-detection');
    }
  }, [navigate]);

  const handleRecommendations = (songs) => {
    setError(null);
    setRecommendations(songs);
    localStorage.setItem('recommendations', JSON.stringify(songs));

    setTimeout(() => {
      if (songs?.length > 0) navigate('/player');
    }, 1500);
  };

  const handleRecommendationsError = (errMsg) => {
    setError(errMsg || 'Failed to load recommendations. Please try again.');
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (!mood || !preferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <Particles />

      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-6 py-12">

          {/* Back Button */}
          <button
            onClick={() => navigate('/preferences')}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Preferences
          </button>

          {/* Header */}
          <div className="text-center mb-12 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mb-6 shadow-2xl">
              <span className="text-4xl">🎵</span>
            </div>

            <h1 className="text-5xl font-black text-white mb-4">Get Recommendations</h1>

            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              AI is curating the perfect playlist based on your mood and preferences
            </p>

            {/* Info Badges */}
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700">
                <span className="text-gray-400 text-sm">Mood:</span>
                <span className="text-white font-semibold ml-1 capitalize">{mood.mood || mood}</span>
              </div>

              <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700">
                <span className="text-gray-400 text-sm">Language:</span>
                <span className="text-white font-semibold ml-1 capitalize">{preferences.language}</span>
              </div>

              {preferences.favoriteSingers?.length > 0 && (
                <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700">
                  <span className="text-gray-400 text-sm">Artists:</span>
                  <span className="text-white font-semibold ml-1">{preferences.favoriteSingers.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* ⭐ Premium Loading or Error Card */}
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-4xl p-12 rounded-3xl bg-gradient-to-br 
              from-slate-800/40 via-purple-900/20 to-slate-800/40 
              shadow-2xl border border-slate-700/40 backdrop-blur-2xl">

              {error ? (
                <div className="flex flex-col items-center text-center animate-fadeIn py-6">
                  <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Unable to Load Recommendations</h3>
                  <p className="text-gray-400 text-sm max-w-md mb-6">{error}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleRetry}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate('/preferences')}
                      className="bg-slate-700/60 hover:bg-slate-700 text-gray-300 font-semibold px-6 py-3 rounded-xl transition-all"
                    >
                      Back to Preferences
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center animate-fadeIn">
                  {/* 🔥 Rotating Neon Loader */}
                  <div className="relative mb-8">
                    <div className="w-28 h-28 rounded-full border-4 border-transparent 
                      border-t-purple-500 border-l-pink-500 animate-spin-slow shadow-lg"></div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50"></div>
                    </div>
                  </div>

                  {/* Typing Line */}
                  <p className="text-xl text-white font-semibold typing-animation mb-2">
                    Please wait…
                  </p>

                  {/* Fade-in Line */}
                  <p className="text-gray-300 text-sm animate-fadeTextSlow">
                    We’re crafting a playlist that matches your vibe 🎶
                  </p>

                  {/* Delayed Subtle Line */}
                  <p className="text-gray-400 text-xs mt-1 italic animate-fadeTextDelay">
                    This may take a little time…
                  </p>

                  {/* Shimmer Progress Bar */}
                  <div className="mt-6 w-64 h-3 bg-slate-700/40 overflow-hidden rounded-full">
                    <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-shimmer"></div>
                  </div>
                </div>
              )}

              {/* Underlying recommendation fetcher */}
              <div className="hidden">
                <Recommendations
                  key={retryCount}
                  mood={mood}
                  preferences={preferences}
                  onRecommendations={handleRecommendations}
                  onError={handleRecommendationsError}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Chatbot */}
      <Chatbot
        isOpen={isChatbotOpen}
        onToggle={() => setIsChatbotOpen(!isChatbotOpen)}
        currentMood={mood}
        onPlaySong={handlePlaySong}
        onPlayPlaylist={handlePlayPlaylist}
      />

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out; }

        /* Neon Spin */
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 2s linear infinite;
        }

        /* Typing Effect */
        .typing-animation {
          width: 17ch;
          overflow: hidden;
          white-space: nowrap;
          border-right: 3px solid white;
          animation: typing 1.6s steps(17), blink .6s infinite step-end alternate;
        }
        @keyframes typing { from { width: 0 } }
        @keyframes blink { 50% { border-color: transparent } }

        /* Fade text animations */
        @keyframes fadeTextSlow {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeTextDelay {
          0% { opacity: 0; transform: translateY(5px); }
          40% { opacity: 0; }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeTextSlow {
          animation: fadeTextSlow 1.2s ease-out forwards;
        }

        .animate-fadeTextDelay {
          animation: fadeTextDelay 2s ease-out forwards;
        }

        /* Shimmer */
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default RecommendationsPage;
