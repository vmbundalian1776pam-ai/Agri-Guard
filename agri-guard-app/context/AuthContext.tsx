import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: number;
  username: string;
  role: 'owner' | 'farmer';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-login disabled for presentation demo purposes
    // Always start at the login screen
    setIsLoading(false);
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('userSession', JSON.stringify(userData));
  };

  const logout = async () => {
    if (user) {
      try {
        const API_BASE_URL = 'http://192.168.100.15/Agri-Guard/backend'; // fallback since we cant easily import config.ts here due to circular deps or just hardcode for simplicity
        await fetch(`${API_BASE_URL}/audit_log.php?user_id=${user.id}&action=logout`);
      } catch (e) {
        console.error("Failed to log audit", e);
      }
    }
    setUser(null);
    await AsyncStorage.removeItem('userSession');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
