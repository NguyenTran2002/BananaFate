/**
 * Dashboard Component
 * Overview of the data collection with quick stats and actions
 */

import React, { useEffect, useState } from 'react';
import { getAnalyticsCounts } from '../utils/apiClient';
import { AnalyticsCounts, NavigationRoute } from '../types';
import CollectionProgress from './CollectionProgress';

interface DashboardProps {
  onNavigate: (route: NavigationRoute) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [counts, setCounts] = useState<AnalyticsCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsCounts();
      setCounts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍌</div>
          <p className="text-dark-subtext">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !counts) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={loadCounts}
          className="mt-4 px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold
                   hover:bg-yellow-500 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Images',
      value: counts.totalImages,
      icon: '📷',
      color: 'brand-yellow',
    },
    {
      label: 'Batches',
      value: counts.totalBatches,
      icon: '📦',
      color: 'brand-green',
      action: () => onNavigate(NavigationRoute.BATCHES),
    },
    {
      label: 'Bananas',
      value: counts.totalBananas,
      icon: '🍌',
      color: 'brand-yellow',
      action: () => onNavigate(NavigationRoute.BANANAS),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-brand-yellow mb-2">Dashboard</h1>
        <p className="text-dark-subtext">Overview of your banana freshness data collection</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={stat.action}
            className={`bg-ocean-surface rounded-xl p-6 border border-${stat.color}/20
                     ${stat.action ? 'cursor-pointer hover:border-' + stat.color + '/50 hover:scale-105' : ''}
                     transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-5xl">{stat.icon}</span>
              <div className={`text-4xl font-bold text-${stat.color}`}>
                {stat.value}
              </div>
            </div>
            <div className="text-dark-subtext text-sm font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Collection Progress */}
      <CollectionProgress totalImages={counts.totalImages} />

      {/* Stage Distribution */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Images by Ripeness Stage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(counts.byStage).map(([stage, count]) => (
            <div
              key={stage}
              className="bg-ocean-deep rounded-lg p-4 text-center border border-brand-green/20"
            >
              <div className="text-3xl font-bold text-brand-green mb-1">{count}</div>
              <div className="text-dark-subtext text-xs">{stage}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate(NavigationRoute.BATCHES)}
            className="p-4 bg-ocean-deep rounded-lg border border-brand-yellow/20
                     hover:border-brand-yellow/50 hover:bg-ocean-deep/70
                     transition-all text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">📦</span>
              <span className="text-xl font-semibold text-dark-text">View Batches</span>
            </div>
            <p className="text-dark-subtext text-sm">
              Browse and manage images organized by collection batch
            </p>
          </button>

          <button
            onClick={() => onNavigate(NavigationRoute.BANANAS)}
            className="p-4 bg-ocean-deep rounded-lg border border-brand-green/20
                     hover:border-brand-green/50 hover:bg-ocean-deep/70
                     transition-all text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">🍌</span>
              <span className="text-xl font-semibold text-dark-text">View Bananas</span>
            </div>
            <p className="text-dark-subtext text-sm">
              Explore banana timelines showing ripeness progression
            </p>
          </button>

          <button
            onClick={() => onNavigate(NavigationRoute.ANALYTICS)}
            className="p-4 bg-ocean-deep rounded-lg border border-brand-yellow/20
                     hover:border-brand-yellow/50 hover:bg-ocean-deep/70
                     transition-all text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">📈</span>
              <span className="text-xl font-semibold text-dark-text">View Analytics</span>
            </div>
            <p className="text-dark-subtext text-sm">
              Visualize trends and distribution with interactive charts
            </p>
          </button>

          <button
            onClick={loadCounts}
            className="p-4 bg-ocean-deep rounded-lg border border-dark-subtext/20
                     hover:border-dark-subtext/50 hover:bg-ocean-deep/70
                     transition-all text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">🔄</span>
              <span className="text-xl font-semibold text-dark-text">Refresh Data</span>
            </div>
            <p className="text-dark-subtext text-sm">
              Update dashboard with latest collection statistics
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
