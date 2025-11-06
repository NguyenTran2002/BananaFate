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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600">
      <div className="w-full max-w-md px-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍌</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Banana Fate
            </h1>
            <p className="text-gray-600 text-sm">
              Data Ingestion Portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Access Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg
                           text-gray-900 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all"
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700
                           transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg
                       hover:bg-blue-700 active:scale-95
                       disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed
                       transition-all duration-200"
            >
              {isLoading ? 'Authenticating...' : 'Access Data Ingestion'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-500 text-xs text-center">
              Authorized personnel only. Contact administrator for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
