/**
 * StorageAnalytics Component
 * Displays storage usage metrics and cost projections
 */

import React, { useEffect, useState } from 'react';
import { getStorageAnalytics } from '../utils/apiClient';
import { StorageAnalytics as StorageAnalyticsType, StorageImageInfo } from '../types';
import { StorageIcon } from './icons/StorageIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { WarningIcon } from './icons/WarningIcon';
import { MoneyIcon } from './icons/MoneyIcon';
import { ChartIcon } from './icons/ChartIcon';
import { CameraIcon } from './icons/CameraIcon';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

export function StorageAnalytics() {
  const [storage, setStorage] = useState<StorageAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStorageAnalytics();
  }, []);

  const loadStorageAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getStorageAnalytics();
      setStorage(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load storage analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <StorageIcon className="w-16 h-16 mb-4 mx-auto animate-bounce text-brand-yellow" />
          <p className="text-dark-subtext">Loading storage analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !storage) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">{error || 'Failed to load storage analytics'}</p>
        <button
          onClick={loadStorageAnalytics}
          className="mt-4 px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render image info row
  const renderImageRow = (img: StorageImageInfo) => (
    <div
      key={img.documentId}
      className="grid grid-cols-4 gap-4 py-3 border-b border-brand-yellow/10 text-sm"
    >
      <div className="text-dark-text font-mono truncate">{img.bananaId}</div>
      <div className="text-dark-subtext truncate">{img.stage}</div>
      <div className="text-brand-yellow font-mono">{img.fileSizeFormatted}</div>
      <div className="text-dark-subtext font-mono text-xs truncate">{img.objectPath}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-yellow mb-2">Storage Analytics</h2>
          <p className="text-dark-subtext">Storage usage, costs, and outlier detection</p>
        </div>
        <button
          onClick={loadStorageAnalytics}
          className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                   rounded-lg hover:border-brand-yellow/50 transition-all flex items-center space-x-2"
        >
          <RefreshIcon className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Warning if images without size */}
      {storage.imagesWithoutSize > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start space-x-3">
          <WarningIcon className="w-6 h-6 flex-shrink-0 text-yellow-400" />
          <p className="text-yellow-400">
            {storage.imagesWithoutSize} images are missing file size data. Run the backfill
            script to update.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Storage */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
          <div className="flex items-center justify-between mb-2">
            <StorageIcon className="w-10 h-10 text-brand-yellow" />
            <div className="text-3xl font-bold text-brand-yellow">
              {storage.totalStorageFormatted}
            </div>
          </div>
          <div className="text-dark-subtext font-medium">Total Storage Used</div>
          <div className="text-xs text-dark-subtext/60 mt-1">
            {storage.totalPhotos.toLocaleString()} photos
          </div>
        </div>

        {/* Average per Photo */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-green/20">
          <div className="flex items-center justify-between mb-2">
            <CameraIcon className="w-10 h-10 text-brand-green" />
            <div className="text-3xl font-bold text-brand-green">
              {storage.averagePerPhotoFormatted}
            </div>
          </div>
          <div className="text-dark-subtext font-medium">Average per Photo</div>
          <div className="text-xs text-dark-subtext/60 mt-1">
            {storage.totalPhotos.toLocaleString()} photos total
          </div>
        </div>

        {/* Average per Banana */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
          <div className="flex items-center justify-between mb-2">
            <BananaGuideIcon className="w-10 h-10 text-brand-yellow" />
            <div className="text-3xl font-bold text-brand-yellow">
              {storage.averagePerBananaFormatted}
            </div>
          </div>
          <div className="text-dark-subtext font-medium">Average per Banana</div>
          <div className="text-xs text-dark-subtext/60 mt-1">
            {storage.totalBananas.toLocaleString()} bananas
          </div>
        </div>

        {/* Estimated Monthly Cost */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <MoneyIcon className="w-10 h-10 text-green-400" />
            <div className="text-3xl font-bold text-green-400">
              ${storage.estimatedMonthlyCostUSD.toFixed(4)}
            </div>
          </div>
          <div className="text-dark-subtext font-medium">Est. Monthly Cost</div>
          <div className="text-xs text-dark-subtext/60 mt-1">GCS Standard ($0.020/GB)</div>
        </div>
      </div>

      {/* Outliers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Largest Images */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-red-500/20">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center">
            <ChartIcon className="w-6 h-6 mr-2" />
            Largest Images
          </h3>
          {storage.largestImages.length > 0 ? (
            <div>
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-brand-yellow/20 text-xs font-semibold text-dark-subtext">
                <div>Banana ID</div>
                <div>Stage</div>
                <div>Size</div>
                <div>Path</div>
              </div>
              {storage.largestImages.map(renderImageRow)}
            </div>
          ) : (
            <p className="text-dark-subtext">No data available</p>
          )}
        </div>

        {/* Smallest Images */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-blue-500/20">
          <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center">
            <ChartIcon className="w-6 h-6 mr-2" />
            Smallest Images
          </h3>
          {storage.smallestImages.length > 0 ? (
            <div>
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-brand-yellow/20 text-xs font-semibold text-dark-subtext">
                <div>Banana ID</div>
                <div>Stage</div>
                <div>Size</div>
                <div>Path</div>
              </div>
              {storage.smallestImages.map(renderImageRow)}
            </div>
          ) : (
            <p className="text-dark-subtext">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
