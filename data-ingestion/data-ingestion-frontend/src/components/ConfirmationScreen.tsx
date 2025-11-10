import React, { useEffect, useState } from 'react';
import { BananaMetadata } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { getSignedReadUrl } from '../utils/apiClient';
import { useImageZoom } from '../hooks/useImageZoom';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ConfirmationScreenProps {
  imageDataUrl: string;
  metadata: BananaMetadata;
  fileSizeBytes: number;
  imageResolution: string;
  bananaHistory?: {
    lastStage: string;
    lastCaptureDate: string;
    lastObjectPath?: string;
    captureCount: number;
  } | null;
  onEdit: () => void;
  onUpload: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  imageDataUrl,
  metadata,
  fileSizeBytes,
  imageResolution,
  bananaHistory,
  onEdit,
  onUpload,
  onRetake,
  onCancel,
}) => {
  // State for previous capture image
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const [loadingPreviousImage, setLoadingPreviousImage] = useState(false);
  const [previousImageError, setPreviousImageError] = useState<string | null>(null);

  // Zoom hooks for both images
  const currentImageZoom = useImageZoom();
  const previousImageZoom = useImageZoom();

  // Fetch previous capture image if available
  useEffect(() => {
    const fetchPreviousImage = async () => {
      if (!bananaHistory?.lastObjectPath) {
        return;
      }

      setLoadingPreviousImage(true);
      setPreviousImageError(null);

      try {
        const result = await getSignedReadUrl(bananaHistory.lastObjectPath);
        setPreviousImageUrl(result.signedUrl);
      } catch (error) {
        console.error('Failed to fetch previous image:', error);
        setPreviousImageError('Failed to load previous image');
      } finally {
        setLoadingPreviousImage(false);
      }
    };

    fetchPreviousImage();
  }, [bananaHistory?.lastObjectPath]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Render zoomable image container
  const renderZoomableImage = (
    imageUrl: string,
    title: string,
    subtitle: string,
    zoom: ReturnType<typeof useImageZoom>,
    isLoading?: boolean,
    error?: string | null
  ) => (
    <div className="bg-ocean-surface/50 p-3 rounded-lg">
      <h3 className="text-sm font-bold mb-2 text-dark-text">{title}</h3>
      <p className="text-xs text-dark-subtext mb-2">{subtitle}</p>

      {isLoading ? (
        <div className="aspect-square bg-gray-800 rounded-md flex items-center justify-center">
          <SpinnerIcon className="w-8 h-8 text-brand-yellow animate-spin" />
        </div>
      ) : error ? (
        <div className="aspect-square bg-gray-800 rounded-md flex items-center justify-center">
          <p className="text-red-400 text-sm text-center px-4">{error}</p>
        </div>
      ) : (
        <>
          {/* Outer border container */}
          <div className="aspect-square bg-brand-yellow p-1.5 rounded-lg shadow-xl mb-3">
            {/* Inner zoom container */}
            <div
              ref={zoom.containerRef}
              className="relative w-full h-full overflow-hidden rounded-md cursor-move touch-none"
              onTouchStart={zoom.handleTouchStart}
              onTouchMove={zoom.handleTouchMove}
              onTouchEnd={zoom.handleTouchEnd}
              onMouseDown={zoom.handleMouseDown}
              onMouseMove={zoom.handleMouseMove}
              onMouseUp={zoom.handleMouseUp}
              onMouseLeave={zoom.handleMouseUp}
            >
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover pointer-events-none select-none"
                style={{
                  transform: `scale(${zoom.scale}) translate(${zoom.position.x / zoom.scale}px, ${zoom.position.y / zoom.scale}px)`,
                  transition: zoom.scale === 1 ? 'transform 0.2s ease-out' : 'none',
                }}
                draggable={false}
              />

              {/* Zoom Indicator */}
              {zoom.scale > 1 && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {zoom.scale.toFixed(1)}x
                </div>
              )}
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={zoom.zoomOut}
              disabled={zoom.scale <= 1}
              className="bg-gray-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              aria-label="Zoom out"
            >
              <MinusIcon className="w-5 h-5" />
            </button>
            <span className="text-dark-text text-sm font-mono min-w-[3rem] text-center">
              {zoom.scale.toFixed(1)}x
            </span>
            <button
              onClick={zoom.zoomIn}
              disabled={zoom.scale >= 4}
              className="bg-gray-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              aria-label="Zoom in"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full h-full p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4 text-dark-text">Confirm Upload</h2>
        <p className="text-center text-dark-subtext mb-6 text-sm">
          Review your capture details before uploading
        </p>

        {/* Current Capture Image */}
        <div className="max-w-sm mx-auto mb-6">
          {renderZoomableImage(
            imageDataUrl,
            'Current Capture',
            `${metadata.stage} • Just captured`,
            currentImageZoom
          )}
        </div>

        {/* Metadata and Actions - Centered */}
        <div className="max-w-sm mx-auto">
          {/* Technical Info */}
          <div className="bg-ocean-surface/50 p-3 rounded-lg mb-4">
          <h3 className="text-sm font-bold mb-2 text-dark-subtext">Image Quality</h3>
          <div className="flex justify-between text-sm">
            <span className="text-dark-text">Resolution:</span>
            <span className="text-dark-text font-mono">{imageResolution}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-dark-text">File Size:</span>
            <span className="text-dark-text font-mono">{formatFileSize(fileSizeBytes)}</span>
          </div>
        </div>

        {/* Banana Details */}
        <div className="bg-ocean-surface/50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-bold mb-3 border-b border-gray-700 pb-2 text-dark-text">
            Banana Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="font-medium text-dark-subtext w-32 flex-shrink-0">Batch ID:</span>
              <span className="text-dark-text">{metadata.batchId}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-dark-subtext w-32 flex-shrink-0">Banana ID:</span>
              <span className="text-dark-text">{metadata.bananaId}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-dark-subtext w-32 flex-shrink-0">Capture Time:</span>
              <span className="text-dark-text text-xs">{metadata.captureTime}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-dark-subtext w-32 flex-shrink-0">Stage:</span>
              <span className="text-dark-text font-semibold">{metadata.stage}</span>
            </div>
            {metadata.notes && (
              <div className="flex">
                <span className="font-medium text-dark-subtext w-32 flex-shrink-0">Notes:</span>
                <span className="text-dark-text">{metadata.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Banana History (if exists) */}
        {bananaHistory && (
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 p-3 rounded-lg mb-6">
            <h3 className="text-sm font-bold mb-2 text-blue-300">Previous Captures</h3>
            <div className="text-sm text-blue-100">
              <p>
                Last stage: <span className="font-bold">{bananaHistory.lastStage}</span>
              </p>
              <p className="text-xs text-blue-200 mt-1">
                {new Date(bananaHistory.lastCaptureDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-xs text-blue-200 mt-1">
                Total captures: {bananaHistory.captureCount}
              </p>
            </div>
          </div>
        )}

        {/* Previous Capture Image (if exists) */}
        {previousImageUrl && (
          <div className="mb-6">
            {renderZoomableImage(
              previousImageUrl,
              'Previous Capture',
              `${bananaHistory?.lastStage || 'Unknown'} • ${bananaHistory?.lastCaptureDate ? new Date(bananaHistory.lastCaptureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date'}`,
              previousImageZoom,
              loadingPreviousImage,
              previousImageError
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onUpload}
            className="w-full bg-brand-yellow text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-400 transition-colors flex items-center justify-center"
          >
            <UploadIcon className="w-6 h-6 mr-2" />
            Upload Now
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onEdit}
              className="bg-gray-700 text-dark-text font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-gray-600 transition-colors text-sm"
            >
              Edit Details
            </button>
            <button
              onClick={onRetake}
              className="bg-gray-700 text-dark-text font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-gray-600 transition-colors text-sm"
            >
              Retake Photo
            </button>
          </div>

          <button
            onClick={onCancel}
            className="w-full font-semibold text-dark-subtext hover:text-white transition-colors py-2"
          >
            Cancel & Go Home
          </button>
        </div>
        {/* End Metadata and Actions */}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
