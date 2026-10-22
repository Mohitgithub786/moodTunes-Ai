/**
 * API Configuration
 * Centralized API base URL referencing environment variable VITE_API_URL
 * Defaults to production Hugging Face Space backend if not provided.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://abhishek2607-music-rec-backend.hf.space';
export default API_BASE_URL;
