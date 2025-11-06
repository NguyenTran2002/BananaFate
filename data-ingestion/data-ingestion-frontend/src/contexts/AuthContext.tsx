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
  getTokenExpirationTime,
} from '../utils/authUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  tokenExpiryWarning: boolean;
  dismissExpiryWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);

  // Check authentication status on mount and periodically
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = checkIsAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);

      if (authenticated) {
        console.log('[AUTH] User is authenticated');
        checkTokenExpiry();
      } else {
        console.log('[AUTH] User is not authenticated');
      }
    };

    checkAuth();

    // Check token expiry every minute
    const interval = setInterval(() => {
      if (checkIsAuthenticated()) {
        checkTokenExpiry();
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  const checkTokenExpiry = () => {
    const expiryTime = getTokenExpirationTime();
    if (expiryTime) {
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      const thirtyMinutes = 30 * 60 * 1000;

      // Show warning if token expires in less than 30 minutes
      if (timeUntilExpiry > 0 && timeUntilExpiry < thirtyMinutes) {
        setTokenExpiryWarning(true);
      }
    }
  };

  const login = async (password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { token, expiresIn } = await apiLogin(password);
      storeAuthToken(token, expiresIn);
      setIsAuthenticated(true);
      setTokenExpiryWarning(false);
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
    setTokenExpiryWarning(false);
    console.log('[AUTH] Logged out');
  };

  const dismissExpiryWarning = () => {
    setTokenExpiryWarning(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    error,
    tokenExpiryWarning,
    dismissExpiryWarning,
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
