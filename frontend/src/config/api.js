/**
 * API Configuration
 * Centralized API base URL referencing environment variable VITE_API_URL
 * Defaults to local backend http://localhost:8000 for development.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export default API_BASE_URL;
