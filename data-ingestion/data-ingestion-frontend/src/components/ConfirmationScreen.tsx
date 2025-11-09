import React from 'react';
import { BananaMetadata } from '../types';
import { UploadIcon } from './icons/UploadIcon';

interface ConfirmationScreenProps {
  imageDataUrl: string;
  metadata: BananaMetadata;
  fileSizeBytes: number;
  imageResolution: string;
  bananaHistory?: {
    lastStage: string;
    lastCaptureDate: string;
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
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto no-scrollbar">
      <div className="max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4 text-dark-text">Confirm Upload</h2>
        <p className="text-center text-dark-subtext mb-6 text-sm">
          Review your capture details before uploading
        </p>

        {/* Image Thumbnail */}
        <div className="bg-brand-yellow p-1.5 rounded-lg shadow-xl mb-6">
          <img
            src={imageDataUrl}
            alt="Banana preview"
            className="w-full aspect-square object-cover rounded-md"
          />
        </div>

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
      </div>
    </div>
  );
};

export default ConfirmationScreen;
