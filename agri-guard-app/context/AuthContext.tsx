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
        // Do not await this fetch so we don't block the UI if network is unreachable
        fetch(`https://agriguard-ai-server.onrender.com/audit_log.php?user_id=${user.id}&action=logout`).catch(e => console.log(e));
      } catch (e) {}
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
