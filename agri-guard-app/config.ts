import { Platform } from 'react-native';

// 🌐 The live Render server — handles all API calls AND the AI model
const PRODUCTION_BACKEND = 'https://agriguard-ai-server.onrender.com';

function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  return PRODUCTION_BACKEND;
}

export const API_BASE_URL = resolveApiBaseUrl();
