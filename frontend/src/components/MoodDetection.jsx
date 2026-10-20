import { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { API_BASE_URL } from '../config/api'

const MoodDetection = ({ onMoodDetected }) => {
  const [isCamera, setIsCamera] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedMood, setDetectedMood] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const webcamRef = useRef(null)
  const BASE_URL = API_BASE_URL
  const moods = [
    { name: 'Happy', emoji: '😊', gradient: 'from-yellow-500 to-orange-500' },
    { name: 'Sad', emoji: '😢', gradient: 'from-blue-500 to-indigo-600' },
    { name: 'Energetic', emoji: '⚡', gradient: 'from-red-500 to-pink-600' },
    { name: 'Calm', emoji: '😌', gradient: 'from-green-500 to-teal-600' },
    { name: 'Intense', emoji: '🔥', gradient: 'from-purple-500 to-purple-700' }
  ]

  const captureAndDetect = async () => {
    if (!webcamRef.current) return
    
    setIsDetecting(true)
    try {
      const imageSrc = webcamRef.current.getScreenshot()
      
      // Convert base64 to blob
      const base64Response = await fetch(imageSrc)
      const blob = await base64Response.blob()
      
      // Create form data
      const formData = new FormData()
      formData.append('file', blob, 'image.jpg')
      
      // Send to backend
      const response = await axios.post(`${BASE_URL}/detect-mood`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setDetectedMood(response.data.mood)
      setConfidence(response.data.confidence)
      
      setTimeout(() => {
        onMoodDetected(response.data)
      }, 2000)
      
    } catch (error) {
      console.error('Error detecting mood:', error)
      alert('Error detecting mood. Please try again.')
    } finally {
      setIsDetecting(false)
    }
  }

  const selectMoodManually = async (mood) => {
    try {
      await axios.post(`${BASE_URL}/detect-mood-manual`, null, {
        params: { mood: mood.toLowerCase() }
      })
      
      setDetectedMood(mood.toLowerCase())
      setConfidence(100)
      
      setTimeout(() => {
        onMoodDetected({ mood: mood.toLowerCase(), confidence: 100 })
      }, 1000)
      
    } catch (error) {
      console.error('Error setting mood:', error)
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 shadow-2xl">
        <div className="text-center mb-10">
          <h3 className="text-4xl font-bold text-white mb-3">How Are You Feeling?</h3>
          <p className="text-gray-400 text-lg">Let's detect your mood to find the perfect soundtrack</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Camera Detection */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-white">Camera Detection</h4>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl mb-6 aspect-square flex items-center justify-center border-2 border-dashed border-purple-500/30 overflow-hidden">
              {isCamera ? (
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-50 animate-ping"></div>
                    <div className="relative w-28 h-28 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                      <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-400">Click to activate camera</p>
                </div>
              )}
            </div>
            
            {!isCamera ? (
              <button
                onClick={() => setIsCamera(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-105 shadow-2xl shadow-purple-500/50"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Start Camera
                </div>
              </button>
            ) : (
              <button
                onClick={captureAndDetect}
                disabled={isDetecting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition transform hover:scale-105 shadow-2xl shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDetecting ? 'Detecting...' : 'Capture & Detect Mood'}
              </button>
            )}

            {/* Result */}
            {detectedMood && (
              <div className="mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-5 text-center animate-fadeIn">
                <p className="text-gray-300 text-sm mb-2 font-medium">Detected Mood</p>
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-5xl">{moods.find(m => m.name.toLowerCase() === detectedMood)?.emoji}</span>
                  <div className="text-left">
                    <p className="text-white text-2xl font-bold capitalize">{detectedMood}</p>
                    <div className="flex items-center">
                      <div className="bg-yellow-500 h-2 rounded-full mr-2" style={{width: `${confidence}px`}}></div>
                      <span className="text-gray-400 text-xs">{Math.round(confidence)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Selection */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/>
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-white">Manual Selection</h4>
            </div>
            <p className="text-gray-400 mb-6">Choose your current mood</p>

            <div className="grid grid-cols-2 gap-4">
              {moods.slice(0, 4).map((mood) => (
                <button
                  key={mood.name}
                  onClick={() => selectMoodManually(mood.name)}
                  className={`relative overflow-hidden bg-gradient-to-br ${mood.gradient} text-white py-8 rounded-2xl transition transform hover:scale-105 shadow-xl hover:shadow-2xl group`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-2">{mood.emoji}</div>
                    <div className="font-bold text-lg">{mood.name}</div>
                  </div>
                </button>
              ))}
              
              <button
                onClick={() => selectMoodManually(moods[4].name)}
                className={`relative overflow-hidden bg-gradient-to-br ${moods[4].gradient} text-white py-8 rounded-2xl transition transform hover:scale-105 shadow-xl hover:shadow-2xl col-span-2 group`}
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition"></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-2">{moods[4].emoji}</div>
                  <div className="font-bold text-lg">{moods[4].name}</div>
                </div>
              </button>
            </div>
          </div>
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
      `}</style>
    </div>
  )
}

export default MoodDetection
