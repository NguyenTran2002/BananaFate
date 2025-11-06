/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../utils/apiClient';
import {
  storeAuthToken,
  clearAuthToken,
  isAuthenticated as checkIsAuthenticated,
} from '../utils/authUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = checkIsAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);

      if (authenticated) {
        console.log('[AUTH] User is authenticated');
      } else {
        console.log('[AUTH] User is not authenticated');
      }
    };

    checkAuth();
  }, []);

  const login = async (password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { token, expiresIn } = await apiLogin(password);
      storeAuthToken(token, expiresIn);
      setIsAuthenticated(true);
      console.log('[AUTH] Login successful');
    } catch (err: any) {
      console.error('[AUTH] Login error:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setError(null);
    console.log('[AUTH] Logged out');
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
