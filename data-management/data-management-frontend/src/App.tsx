/**
 * Main Application Component
 * Handles authentication, routing, and layout
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { NavigationSidebar } from './components/NavigationSidebar';
import { Dashboard } from './components/Dashboard';
import { BatchView } from './components/BatchView';
import { BananaView } from './components/BananaView';
import { Analytics } from './components/Analytics';
import { NavigationRoute } from './types';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { WarningIcon } from './components/icons/WarningIcon';
import { CloseIcon } from './components/icons/CloseIcon';

function AppContent() {
  const { isAuthenticated, isLoading, tokenExpiryWarning, dismissExpiryWarning } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute>(NavigationRoute.DASHBOARD);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ocean-deep">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
          </div>
          <p className="text-dark-subtext">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Main app layout
  return (
    <div className="flex h-screen bg-ocean-deep overflow-hidden">
      {/* Token expiry warning banner */}
      {tokenExpiryWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-gray-900 p-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WarningIcon className="w-5 h-5" />
              <p className="text-sm font-medium">
                Your session will expire soon. Please save your work and log in again.
              </p>
            </div>
            <button
              onClick={dismissExpiryWarning}
              className="text-gray-900 hover:text-gray-700 ml-4"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <NavigationSidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {currentRoute === NavigationRoute.DASHBOARD && <Dashboard onNavigate={setCurrentRoute} />}
            {currentRoute === NavigationRoute.BATCHES && <BatchView />}
            {currentRoute === NavigationRoute.BANANAS && <BananaView />}
            {currentRoute === NavigationRoute.ANALYTICS && <Analytics />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
