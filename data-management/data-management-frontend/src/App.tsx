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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute>(NavigationRoute.DASHBOARD);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ocean-deep">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍌</div>
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
