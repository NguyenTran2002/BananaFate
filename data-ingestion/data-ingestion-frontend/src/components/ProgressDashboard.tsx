import React, { useState, useEffect } from 'react';
import { getMobileDashboard, ApiError } from '../utils/apiClient';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ProgressDashboardProps {
  onClose: () => void;
}

interface DashboardData {
  totalImages: number;
  progressToGoal: number;
  goal: number;
  stageDistribution: Array<{ stage: string; count: number }>;
  storage: {
    totalStorageBytes: number;
    totalStorageFormatted: string;
    totalPhotos: number;
    averagePerPhotoBytes: number;
    averagePerPhotoFormatted: string;
    estimatedMonthlyCostUSD: number;
  };
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ onClose }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getMobileDashboard();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Stage colors mapping
  const stageColors: Record<string, string> = {
    'Under Ripe': 'bg-green-600',
    'Barely Ripe': 'bg-yellow-600',
    'Ripe': 'bg-brand-yellow',
    'Very Ripe': 'bg-orange-500',
    'Over Ripe': 'bg-orange-700',
    'Death': 'bg-gray-700',
  };

  return (
    <div className="fixed inset-0 bg-ocean-deep bg-opacity-95 z-50 flex items-center justify-center p-4">
      <div className="bg-ocean-surface rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="sticky top-0 bg-ocean-surface border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-dark-text">Collection Progress</h2>
          <button
            onClick={onClose}
            className="text-dark-subtext hover:text-white transition-colors text-2xl leading-none"
            aria-label="Close dashboard"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <SpinnerIcon className="w-12 h-12 text-brand-yellow" />
              <p className="text-dark-subtext mt-4">Loading analytics...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {data && !loading && !error && (
            <>
              {/* Progress to 500 */}
              <div className="bg-ocean-deep rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-dark-text">Goal Progress</h3>
                  <span className="text-2xl font-bold text-brand-yellow">{data.progressToGoal.toFixed(0)}%</span>
                </div>
                <div className="relative w-full h-8 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-yellow to-yellow-500 transition-all duration-500"
                    style={{ width: `${Math.min(data.progressToGoal, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                    {data.totalImages} / {data.goal}
                  </div>
                </div>
                <p className="text-xs text-dark-subtext mt-2 text-center">
                  {data.goal - data.totalImages > 0
                    ? `${data.goal - data.totalImages} more to reach goal!`
                    : 'Goal achieved! 🎉'}
                </p>
              </div>

              {/* Stage Distribution - Bar Chart */}
              <div className="bg-ocean-deep rounded-lg p-4">
                <h3 className="text-lg font-bold text-dark-text mb-4">Images by Stage</h3>
                {data.stageDistribution.length > 0 ? (
                  (() => {
                    // Define stage order
                    const stageOrder = ['Under Ripe', 'Barely Ripe', 'Ripe', 'Very Ripe', 'Over Ripe', 'Death'];

                    // Create a map for quick lookup
                    const stageMap = new Map(data.stageDistribution.map(s => [s.stage, s.count]));

                    // Build ordered data with 0 for missing stages
                    const orderedData = stageOrder.map(stage => ({
                      stage,
                      count: stageMap.get(stage) || 0
                    }));

                    // Find max count for scaling
                    const maxCount = Math.max(...orderedData.map(s => s.count), 1);

                    return (
                      <div className="space-y-1">
                        {orderedData.map(({ stage, count }) => (
                          <div key={stage} className="flex items-end gap-2">
                            {/* Stage label */}
                            <div className="w-20 text-xs text-dark-subtext text-right flex-shrink-0">
                              {stage}
                            </div>

                            {/* Bar container */}
                            <div className="flex-1 flex items-center gap-1">
                              {/* Bar */}
                              <div
                                className={`h-8 ${stageColors[stage] || 'bg-gray-500'} rounded transition-all duration-300 flex items-center justify-end pr-2`}
                                style={{
                                  width: count > 0 ? `${(count / maxCount) * 100}%` : '0%',
                                  minWidth: count > 0 ? '2rem' : '0'
                                }}
                              >
                                {/* Count inside bar (white text) */}
                                {count > 0 && (
                                  <span className="text-xs font-bold text-white">{count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-dark-subtext text-center py-2">No data yet</p>
                )}
              </div>

              {/* Storage Statistics */}
              <div className="bg-ocean-deep rounded-lg p-4">
                <h3 className="text-lg font-bold text-dark-text mb-3">Storage Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ocean-surface rounded-lg p-3">
                    <p className="text-xs text-dark-subtext mb-1">Total Storage</p>
                    <p className="text-sm font-bold text-dark-text">{data.storage.totalStorageFormatted}</p>
                  </div>
                  <div className="bg-ocean-surface rounded-lg p-3">
                    <p className="text-xs text-dark-subtext mb-1">Photos</p>
                    <p className="text-sm font-bold text-dark-text">{data.storage.totalPhotos}</p>
                  </div>
                  <div className="bg-ocean-surface rounded-lg p-3">
                    <p className="text-xs text-dark-subtext mb-1">Avg per Photo</p>
                    <p className="text-sm font-bold text-dark-text">{data.storage.averagePerPhotoFormatted}</p>
                  </div>
                  <div className="bg-ocean-surface rounded-lg p-3">
                    <p className="text-xs text-dark-subtext mb-1">Monthly Cost</p>
                    <p className="text-sm font-bold text-dark-text">${data.storage.estimatedMonthlyCostUSD.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Close Button */}
          {!loading && (
            <button
              onClick={onClose}
              className="w-full bg-brand-yellow text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-400 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
