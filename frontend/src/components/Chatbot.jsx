import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const Chatbot = ({ isOpen, onToggle, currentMood, onPlaySong, onPlayPlaylist }) => {
  // Load messages from sessionStorage on mount
  const [messages, setMessages] = useState(() => {
    const savedMessages = sessionStorage.getItem('chatbotMessages');
    if (savedMessages) {
      return JSON.parse(savedMessages);
    }
    return [
      {
        role: 'assistant',
        content: 'Hi! I\'m your music assistant. You can:\n• Say "play [song name]" for instant playback\n• Say "play playlist [name]" to play your playlists\n• Ask for recommendations\n• Search by artist, lyrics, or mood!',
        songs: [],
        playCommand: null,
        playlistName: null
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('chatbotMessages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const handleSongClick = async (songName, artistName) => {
    try {
      console.log(`🎵 Playing: "${songName}" by ${artistName}`);
      
      setMessages(prev => [...prev, {
        role: 'system',
        content: `🔍 Loading "${songName}"...`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
      const response = await axios.get(`${API_BASE_URL}/search-song`, {
        params: { name: songName, artist: artistName }
      });
      
      const song = response.data;
      
      if (!song.youtube_id) {
        setMessages(prev => prev.filter(msg => !msg.content.includes('🔍 Loading')));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ "${songName}" found but no video available.`,
          songs: [],
          playCommand: null,
          playlistName: null
        }]);
        return;
      }
      
      setMessages(prev => prev.filter(msg => !msg.content.includes('🔍 Loading')));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Now playing: "${song.name}" by ${song.artist}`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
      if (onPlaySong) {
        onPlaySong(song);
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setMessages(prev => prev.filter(msg => !msg.content.includes('🔍 Loading')));
      
      const errorMsg = error.response?.data?.detail || 'Song not found';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${errorMsg}`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
    }
  };

  const handlePlaylistClick = async (playlistName) => {
    try {
      console.log(`🎵 Loading playlist: "${playlistName}"`);
      
      setMessages(prev => [...prev, {
        role: 'system',
        content: `🎵 Loading playlist "${playlistName}"...`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setMessages(prev => prev.filter(msg => !msg.content.includes('🎵 Loading playlist')));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Please login to access your playlists.',
          songs: [],
          playCommand: null,
          playlistName: null
        }]);
        return;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/api/playlists/by-name/${encodeURIComponent(playlistName)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const playlist = response.data;
      
      if (!playlist.songs || playlist.songs.length === 0) {
        setMessages(prev => prev.filter(msg => !msg.content.includes('🎵 Loading playlist')));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ Playlist "${playlistName}" is empty.`,
          songs: [],
          playCommand: null,
          playlistName: null
        }]);
        return;
      }
      
      setMessages(prev => prev.filter(msg => !msg.content.includes('🎵 Loading playlist')));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🎵 Now playing "${playlist.name}" (${playlist.songs.length} songs)`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
      // Pass playlist to parent component to handle playback
      if (onPlayPlaylist) {
        onPlayPlaylist(playlist);
      }
      
    } catch (error) {
      console.error('❌ Playlist error:', error);
      setMessages(prev => prev.filter(msg => !msg.content.includes('🎵 Loading playlist')));
      
      const errorMsg = error.response?.data?.detail || `Playlist "${playlistName}" not found`;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${errorMsg}`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Check if audio has sufficient data
        if (audioBlob.size < 1000) {
          setMessages(prev => prev.filter(msg => msg.role !== 'system'));
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '⚠️ Recording too short. Please speak for at least 1 second.',
            songs: [],
            playCommand: null,
            playlistName: null
          }]);
        } else {
          await transcribeAudio(audioBlob);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      setMessages(prev => [...prev, {
        role: 'system',
        content: '🎤 Listening... Speak now (supports English & Hindi)',
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // Choose endpoint based on language selection
      const endpoint = selectedLanguage === 'auto' 
        ? `${API_BASE_URL}/voice/transcribe-detailed`
        : `${API_BASE_URL}/voice/transcribe?language=${selectedLanguage}`;
      
      const response = await axios.post(
        endpoint,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 // 30 second timeout
        }
      );
      
      const { transcript, detected_language, language_name, confidence } = response.data;
      
      setMessages(prev => prev.filter(msg => msg.role !== 'system'));
      setInput(transcript);
      
      // Show language detection info
      const languageInfo = language_name ? ` (${language_name})` : '';
      const confidenceInfo = confidence ? ` [${Math.round(confidence * 100)}% confident]` : '';
      
      setMessages(prev => [...prev, {
        role: 'user',
        content: `🎤 ${transcript}${languageInfo}${confidenceInfo}`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
      
      setTimeout(() => handleSendMessage(transcript), 500);
      
    } catch (error) {
      console.error('Transcription error:', error);
      setMessages(prev => prev.filter(msg => msg.role !== 'system'));
      
      let errorMessage = 'Sorry, couldn\'t understand. Please try again.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Transcription timeout. Please try with shorter audio.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
    } finally {
      setIsTranscribing(false);
    }
  };

  const renderMessage = (message) => {
    const { content, songs, playCommand, playlistName } = message;
    
    return (
      <div className="space-y-2">
        {content && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        )}
        
        {/* Render song buttons */}
        {songs && songs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {songs.map((song, idx) => (
              <button
                key={idx}
                onClick={() => handleSongClick(song.name, song.artist)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400 rounded-lg text-purple-300 hover:text-purple-200 transition-all text-sm group"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <div className="text-left">
                  <div className="font-medium">{song.name}</div>
                  <div className="text-xs text-purple-400/70">{song.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSendMessage = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: textToSend,
        user_id: 'default',
        current_mood: currentMood?.mood || currentMood
      });

      // Handle playlist command
      if (response.data.playlist_name) {
        await handlePlaylistClick(response.data.playlist_name);
      }
      // Handle direct play command
      else if (response.data.play_command && response.data.play_command.autoplay) {
        const cmd = response.data.play_command;
        await handleSongClick(cmd.name, cmd.artist);
      }

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response || '',
        songs: response.data.recommended_songs || [],
        playCommand: response.data.play_command || null,
        playlistName: response.data.playlist_name || null
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.response?.data?.detail || 'Connection error. Please try again.',
        songs: [],
        playCommand: null,
        playlistName: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: input,
      songs: [],
      playCommand: null,
      playlistName: null
    };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    await handleSendMessage(currentInput);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 z-50 group transform hover:scale-110"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/30 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Music Assistant</h3>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Voice & Text
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : message.role === 'system' ? 'justify-center' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none'
                      : message.role === 'system'
                      ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-lg'
                      : 'bg-gray-800 text-gray-200 rounded-bl-none'
                  }`}
                >
                  {renderMessage(message)}
                  {message.role !== 'system' && (
                    <p className="text-xs mt-2 opacity-70">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {(isLoading || isTranscribing) && (
              <div className="flex justify-start">
                <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none shadow-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-2xl">
            {/* Info Section */}
            <div className="mb-3 space-y-2">
              {currentMood && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Current mood:</span>
                  <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full capitalize">
                    {currentMood.mood || currentMood}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">Voice language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-xs focus:outline-none focus:border-purple-500"
                    disabled={isRecording || isTranscribing}
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('chatbotMessages');
                    setMessages([
                      {
                        role: 'assistant',
                        content: 'Hi! I\'m your music assistant. You can:\n• Say "play [song name]" for instant playback\n• Say "play playlist [name]" to play your playlists\n• Ask for recommendations\n• Search by artist, lyrics, or mood!',
                        songs: [],
                        playCommand: null,
                        playlistName: null
                      }
                    ]);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg transition-all text-xs"
                  title="Clear chat history"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Play song/playlist, recommend..."
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 text-sm"
                disabled={isLoading || isRecording}
              />
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isTranscribing}
                className={`rounded-lg px-4 py-2 transition-all disabled:opacity-50 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90'
                } text-white`}
              >
                {isRecording ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || isRecording}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isRecording ? (
                <span className="text-red-400 font-semibold animate-pulse">
                  🔴 Recording... Click to stop
                </span>
              ) : isTranscribing ? (
                <span className="text-yellow-400 font-semibold">
                  ⏳ Transcribing audio...
                </span>
              ) : (
                "Try: \"Play Bohemian Rhapsody\" or \"Play my Workout playlist\""
              )}
            </p>
          </div>
        </div>
      )}

      <style>{`
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
    </>
  );
};

export default Chatbot;
