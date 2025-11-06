/**
 * Login Screen
 * Password authentication for data ingestion access
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      return;
    }

    try {
      await login(password);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-deep via-ocean-surface to-ocean-deep">
      <div className="w-full max-w-md px-8">
        <div className="bg-ocean-surface rounded-2xl shadow-2xl p-8 border border-brand-yellow/20">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍌</div>
            <h1 className="text-3xl font-bold text-brand-yellow mb-2">
              Banana Fate
            </h1>
            <p className="text-dark-subtext text-sm">
              Data Ingestion Portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-text mb-2">
                Access Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                           text-dark-text placeholder-dark-subtext/50
                           focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent
                           transition-all"
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-subtext hover:text-dark-text
                           transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 px-4 bg-brand-yellow text-ocean-deep font-semibold rounded-lg
                       hover:bg-yellow-500 active:scale-95
                       disabled:bg-dark-subtext/30 disabled:text-dark-subtext disabled:cursor-not-allowed
                       transition-all duration-200"
            >
              {isLoading ? 'Authenticating...' : 'Access Data Ingestion'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-dark-subtext/20">
            <p className="text-dark-subtext text-xs text-center">
              Authorized personnel only. Contact administrator for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
