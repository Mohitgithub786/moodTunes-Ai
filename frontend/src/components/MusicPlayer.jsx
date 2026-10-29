import { useState, useEffect } from 'react';
import AddToPlaylistButton from './AddToPlaylistButton';

const MusicPlayer = ({ currentSong, queue, onPlaySong }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volume, setVolume] = useState(70);

  useEffect(() => {
    if (currentSong && queue.length > 0) {
      const index = queue.findIndex(song => song.id === currentSong.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [currentSong, queue]);

  const playNext = () => {
    if (currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1];
      onPlaySong(nextSong);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      const prevSong = queue[currentIndex - 1];
      onPlaySong(prevSong);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!currentSong) {
    return (
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">No song selected</p>
          <p className="text-gray-500 text-sm mt-2">Choose a song from the recommendations to start playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          Now Playing
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* YouTube Player */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl overflow-hidden border-2 border-purple-500/30">
              {currentSong.youtube_id ? (
                <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${currentSong.youtube_id}?autoplay=1&enablejsapi=1&rel=0`}
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

            {/* Song Info */}
            <div className="mt-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-white truncate">{currentSong.name}</h3>
                  <p className="text-lg text-gray-400 mt-1 truncate">{currentSong.artist}</p>
                  
                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {currentSong.listeners && (
                      <div className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {formatNumber(currentSong.listeners)} listeners
                      </div>
                    )}
                    {currentSong.playcount && (
                      <div className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        {formatNumber(currentSong.playcount)} plays
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

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <AddToPlaylistButton song={currentSong} />
                {currentSong.youtube_id && (
                  <a
                    href={`https://www.youtube.com/watch?v=${currentSong.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-xl transition-all shadow-md hover:shadow-red-600/20"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    Watch on YouTube
                  </a>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={playPrevious}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                  </svg>
                </button>

                <div className="text-white text-center">
                  <div className="text-3xl font-bold">{currentIndex + 1}</div>
                  <div className="text-xs text-gray-400">of {queue.length}</div>
                </div>

                <button
                  onClick={playNext}
                  disabled={currentIndex === queue.length - 1}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                Up Next ({queue.length})
              </h4>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                {queue.map((song, index) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      onPlaySong(song);
                      setCurrentIndex(index);
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      song.id === currentSong?.id
                        ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-purple-500/50 shadow-lg'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        song.id === currentSong?.id 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-white/10'
                      }`}>
                        {song.id === currentSong?.id ? (
                          <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-white font-semibold text-sm">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{song.name}</p>
                        <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
          background: rgba(255, 255, 255, 0.05);
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

export default MusicPlayer;
