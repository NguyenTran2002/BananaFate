/**
 * Navigation Sidebar
 * Main navigation for the management portal
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavigationRoute } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';
import { BoxIcon } from './icons/BoxIcon';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { ChartIcon } from './icons/ChartIcon';
import { DoorIcon } from './icons/DoorIcon';

interface NavigationSidebarProps {
  currentRoute: NavigationRoute;
  onNavigate: (route: NavigationRoute) => void;
}

export function NavigationSidebar({ currentRoute, onNavigate }: NavigationSidebarProps) {
  const { logout } = useAuth();

  const navItems = [
    { route: NavigationRoute.DASHBOARD, label: 'Dashboard', icon: DashboardIcon },
    { route: NavigationRoute.BATCHES, label: 'Batches', icon: BoxIcon },
    { route: NavigationRoute.BANANAS, label: 'Bananas', icon: BananaGuideIcon },
    { route: NavigationRoute.ANALYTICS, label: 'Analytics', icon: ChartIcon },
  ];

  return (
    <div className="w-64 bg-ocean-surface border-r border-brand-yellow/20 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-brand-yellow/20">
        <div className="flex items-center space-x-3">
          <BananaGuideIcon className="w-10 h-10 text-brand-yellow" />
          <div>
            <h1 className="text-xl font-bold text-brand-yellow">Banana Fate</h1>
            <p className="text-xs text-dark-subtext">Data Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = currentRoute === item.route;
          const IconComponent = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left
                       transition-all duration-200 ${
                         isActive
                           ? 'bg-brand-yellow text-ocean-deep font-semibold'
                           : 'text-dark-text hover:bg-ocean-deep/50'
                       }`}
            >
              <IconComponent className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-brand-yellow/20">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left
                   text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <DoorIcon className="w-6 h-6" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
