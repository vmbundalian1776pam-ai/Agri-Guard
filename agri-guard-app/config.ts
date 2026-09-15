import { Platform } from 'react-native';

const LOCAL_IP = '192.168.100.15';

function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // GitHub Codespaces pattern (e.g., app-name-8081.app.github.dev -> app-name-8000.app.github.dev)
    if (hostname.includes('github.dev') || hostname.includes('githubpreview.dev')) {
      const backendHostname = hostname.replace(/-\d+\./, '-8000.');
      return `${window.location.protocol}//${backendHostname}`;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  
  return `http://${LOCAL_IP}/Agri-Guard/backend`;
}

export const API_BASE_URL = resolveApiBaseUrl();

