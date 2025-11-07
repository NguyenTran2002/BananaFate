/**
 * Analytics Component
 * Data visualization with charts and statistics
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { getAnalyticsCounts, getAnalyticsTimeline, getStageDistribution } from '../utils/apiClient';
import { AnalyticsCounts, TimelineDataPoint, StageDistribution } from '../types';
import { StorageAnalytics } from './StorageAnalytics';
import { DeletionHistory } from './DeletionHistory';

export function Analytics() {
  const [counts, setCounts] = useState<AnalyticsCounts | null>(null);
  const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
  const [distribution, setDistribution] = useState<StageDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [countsData, timelineData, distributionData] = await Promise.all([
        getAnalyticsCounts(),
        getAnalyticsTimeline(),
        getStageDistribution(),
      ]);
      setCounts(countsData);
      setTimeline(timelineData);
      setDistribution(distributionData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📈</div>
          <p className="text-dark-subtext">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !counts) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">{error || 'Failed to load analytics'}</p>
        <button
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Color palettes
  const stageColors: Record<string, string> = {
    'Under Ripe': '#32CD32',
    'Barely Ripe': '#90EE90',
    'Ripe': '#FFD700',
    'Very Ripe': '#FFA500',
    'Over Ripe': '#FF4500',
    Death: '#8B0000',
  };

  const pieColors = ['#FFD700', '#32CD32', '#FF4500', '#FFA500', '#90EE90', '#8B0000'];

  // Prepare batch data for chart
  const batchData = Object.entries(counts.byBatch).map(([batch, count]) => ({
    batch,
    count,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-brand-yellow mb-2">Analytics</h1>
          <p className="text-dark-subtext">Data insights and visualization</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                   rounded-lg hover:border-brand-yellow/50 transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">📷</span>
            <div className="text-4xl font-bold text-brand-yellow">{counts.totalImages}</div>
          </div>
          <div className="text-dark-subtext font-medium">Total Images</div>
        </div>

        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-green/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">🍌</span>
            <div className="text-4xl font-bold text-brand-green">{counts.totalBananas}</div>
          </div>
          <div className="text-dark-subtext font-medium">Unique Bananas</div>
        </div>

        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">📦</span>
            <div className="text-4xl font-bold text-brand-yellow">{counts.totalBatches}</div>
          </div>
          <div className="text-dark-subtext font-medium">Collection Batches</div>
        </div>
      </div>

      {/* Stage Distribution - Pie Chart */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Ripeness Stage Distribution</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="count"
                nameKey="stage"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={(entry) => `${entry.stage}: ${entry.count} (${entry.percentage}%)`}
                labelLine={{ stroke: '#edf2f7' }}
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1b263b',
                  border: '1px solid #FFD700',
                  borderRadius: '8px',
                  color: '#edf2f7',
                }}
              />
              <Legend wrapperStyle={{ color: '#edf2f7' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline - Line Chart */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Capture Activity Timeline</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#a0aec0" opacity={0.2} />
              <XAxis dataKey="date" stroke="#edf2f7" />
              <YAxis stroke="#edf2f7" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1b263b',
                  border: '1px solid #FFD700',
                  borderRadius: '8px',
                  color: '#edf2f7',
                }}
              />
              <Legend wrapperStyle={{ color: '#edf2f7' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#FFD700"
                strokeWidth={3}
                dot={{ fill: '#FFD700', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Batch Comparison - Bar Chart */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Images per Batch</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={batchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#a0aec0" opacity={0.2} />
              <XAxis dataKey="batch" stroke="#edf2f7" />
              <YAxis stroke="#edf2f7" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1b263b',
                  border: '1px solid #32CD32',
                  borderRadius: '8px',
                  color: '#edf2f7',
                }}
              />
              <Legend wrapperStyle={{ color: '#edf2f7' }} />
              <Bar dataKey="count" fill="#32CD32" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stage Statistics Table */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-2xl font-bold text-brand-yellow mb-6">Stage Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-yellow/20">
                <th className="text-left py-3 px-4 text-dark-subtext font-semibold">Stage</th>
                <th className="text-right py-3 px-4 text-dark-subtext font-semibold">Count</th>
                <th className="text-right py-3 px-4 text-dark-subtext font-semibold">Percentage</th>
                <th className="text-left py-3 px-4 text-dark-subtext font-semibold">Visual</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((item) => (
                <tr key={item.stage} className="border-b border-dark-subtext/10">
                  <td className="py-3 px-4 text-dark-text font-medium">{item.stage}</td>
                  <td className="py-3 px-4 text-right text-brand-green font-semibold">
                    {item.count}
                  </td>
                  <td className="py-3 px-4 text-right text-brand-yellow font-semibold">
                    {item.percentage}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-ocean-deep rounded-full h-4">
                      <div
                        className="h-4 rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: stageColors[item.stage] || '#FFD700',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage Analytics Section */}
      <div className="pt-8 mt-8 border-t border-brand-yellow/20">
        <StorageAnalytics />
      </div>

      {/* Deletion History Section */}
      <div className="pt-8 mt-8 border-t border-brand-yellow/20">
        <DeletionHistory />
      </div>
    </div>
  );
}
