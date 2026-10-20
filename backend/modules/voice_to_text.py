"""
Enhanced Voice to Text Module with Multilingual Support
Handles voice transcription using Deepgram API with compatibility for Deepgram SDK v5+ and legacy versions.
"""
import asyncio
from fastapi import UploadFile, HTTPException
from modules.config import Config


class VoiceToText:
    """Enhanced voice transcription handler with multilingual support"""
    
    def __init__(self):
        self._deepgram = None
        self.supported_languages = {
            'en': 'English',
            'hi': 'Hindi',
            'auto': 'Auto-detect'
        }

    @property
    def deepgram(self):
        if self._deepgram is None:
            self._deepgram = Config.get_deepgram()
        return self._deepgram
    
    def _call_deepgram(self, audio_data: bytes, language: str = 'auto', with_timestamps: bool = False):
        """Execute Deepgram transcription call (runs in background thread)."""
        client = self.deepgram
        if not client:
            raise RuntimeError("Deepgram client not initialized")

        # Deepgram SDK v5+
        if hasattr(client, 'listen') and hasattr(client.listen, 'v1') and hasattr(client.listen.v1, 'media'):
            kwargs = {
                "request": audio_data,
                "model": "nova-2",
                "smart_format": True,
                "punctuate": True,
            }
            if language == 'auto':
                kwargs["detect_language"] = True
            else:
                kwargs["language"] = language

            if with_timestamps:
                kwargs["utterances"] = True

            return client.listen.v1.media.transcribe_file(**kwargs)

        # Legacy Deepgram SDK (v3/v2) fallback
        elif hasattr(client, 'listen') and hasattr(client.listen, 'prerecorded'):
            payload = {"buffer": audio_data}
            options = {
                "model": "nova-2",
                "smart_format": True,
                "punctuate": True,
            }
            if language == 'auto':
                options["detect_language"] = True
            else:
                options["language"] = language
            if with_timestamps:
                options["utterances"] = True
            return client.listen.prerecorded.v("1").transcribe_file(payload, options)

        else:
            raise RuntimeError("Unsupported Deepgram SDK version")

    async def transcribe_audio(self, file: UploadFile, language: str = 'auto') -> str:
        """
        Enhanced transcription with auto language detection.
        Runs transcription in a worker thread so the event loop is never blocked.
        """
        if not self.deepgram:
            raise HTTPException(
                status_code=503,
                detail="Deepgram not configured. Add DEEPGRAM_API_KEY to .env"
            )
        
        try:
            audio_data = await file.read()
            if not audio_data or len(audio_data) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Empty audio file received"
                )
            
            response = await asyncio.to_thread(self._call_deepgram, audio_data, language)

            # Extract transcript from Deepgram response
            channel = response.results.channels[0]
            transcript = channel.alternatives[0].transcript if channel.alternatives else ""
            
            detected_language = getattr(channel, 'detected_language', None)
            if detected_language:
                print(f"🌍 Detected language: {detected_language}")
            
            if not transcript or len(transcript.strip()) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No speech detected in audio. Please speak clearly and try again."
                )
            
            cleaned_transcript = transcript.strip()
            print(f"✅ Transcribed ({detected_language or language}): {cleaned_transcript}")
            return cleaned_transcript
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Deepgram transcription error: {e}")
            error_msg = str(e)
            if "timeout" in error_msg.lower():
                detail = "Transcription timeout. Audio might be too long or unclear."
            elif "network" in error_msg.lower():
                detail = "Network error. Please check your internet connection."
            else:
                detail = f"Transcription failed: {error_msg}"
            raise HTTPException(status_code=500, detail=detail)

    async def transcribe_audio_hindi_english(self, file: UploadFile, language: str = "en") -> str:
        """Transcribe with specific language (Hindi or English)."""
        return await self.transcribe_audio(file, language)

    async def transcribe_audio_multilang(self, file: UploadFile) -> dict:
        """Auto-detect language and transcribe with detailed response."""
        if not self.deepgram:
            raise HTTPException(
                status_code=503,
                detail="Deepgram not configured. Add DEEPGRAM_API_KEY to .env"
            )
        
        try:
            audio_data = await file.read()
            if not audio_data or len(audio_data) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Empty audio file received"
                )
            
            response = await asyncio.to_thread(self._call_deepgram, audio_data, 'auto')
            channel = response.results.channels[0]
            alternative = channel.alternatives[0] if channel.alternatives else None
            transcript = alternative.transcript if alternative else ""
            confidence = getattr(alternative, 'confidence', None)
            detected_language = getattr(channel, 'detected_language', 'unknown')
            
            if not transcript or len(transcript.strip()) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No speech detected in audio"
                )
            
            result = {
                "transcript": transcript.strip(),
                "detected_language": detected_language,
                "confidence": confidence,
                "language_name": self.supported_languages.get(detected_language, detected_language)
            }
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Deepgram multilang error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Transcription failed: {str(e)}"
            )

    async def transcribe_with_timestamps(self, file: UploadFile) -> dict:
        """Transcribe with word-level timestamps."""
        if not self.deepgram:
            raise HTTPException(
                status_code=503,
                detail="Deepgram not configured"
            )
        
        try:
            audio_data = await file.read()
            if not audio_data or len(audio_data) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Empty audio file received"
                )

            response = await asyncio.to_thread(self._call_deepgram, audio_data, 'auto', True)
            channel = response.results.channels[0]
            alternative = channel.alternatives[0] if channel.alternatives else None
            transcript = alternative.transcript if alternative else ""
            
            words_with_timestamps = []
            if alternative and hasattr(alternative, 'words') and alternative.words:
                for word_info in alternative.words:
                    words_with_timestamps.append({
                        "word": getattr(word_info, 'word', ''),
                        "start": getattr(word_info, 'start', 0),
                        "end": getattr(word_info, 'end', 0),
                        "confidence": getattr(word_info, 'confidence', None)
                    })
            
            return {
                "transcript": transcript.strip(),
                "words": words_with_timestamps,
                "detected_language": getattr(channel, 'detected_language', 'unknown')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Timestamp transcription error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Transcription with timestamps failed: {str(e)}"
            )

    def get_supported_languages(self) -> dict:
        """Get list of supported languages"""
        return self.supported_languages


# Create singleton instance
voice_to_text = VoiceToText()
