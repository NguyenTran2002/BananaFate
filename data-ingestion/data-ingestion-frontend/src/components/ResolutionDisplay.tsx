import React from 'react';
import {
  CaptureMethod,
  StreamResolution,
  SafariInfo,
  formatResolution,
  getQualityBadgeColor,
  getQualityLabel
} from '../utils/cameraCapabilities';

interface ResolutionDisplayProps {
  method: CaptureMethod;
  resolution: StreamResolution | null;
  safariInfo: SafariInfo;
  fileSize?: number;
  className?: string;
  compact?: boolean;
}

/**
 * Displays capture method, resolution, and quality information
 * to help users understand what quality they're capturing at
 */
const ResolutionDisplay: React.FC<ResolutionDisplayProps> = ({
  method,
  resolution,
  safariInfo,
  fileSize,
  className = '',
  compact = false
}) => {
  const badgeColor = getQualityBadgeColor(method, safariInfo);
  const qualityLabel = getQualityLabel(method, safariInfo);

  const methodNames: Record<CaptureMethod, string> = {
    'imagecapture': 'ImageCapture API',
    'native-input': 'Native Camera',
    'getusermedia-canvas': 'Live Stream'
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
        <span className={`${badgeColor} text-white px-2 py-0.5 rounded`}>
          {qualityLabel}
        </span>
        {resolution && (
          <span className="text-dark-subtext">
            {formatResolution(resolution)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-dark-card p-3 rounded-lg border border-dark-subtext/20 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-brand-yellow">Capture Info</p>
        <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded font-medium`}>
          {qualityLabel}
        </span>
      </div>

      <div className="space-y-1 text-xs text-dark-subtext">
        <div className="flex justify-between">
          <span>Method:</span>
          <span className="text-white font-medium">{methodNames[method]}</span>
        </div>

        {resolution && (
          <div className="flex justify-between">
            <span>Resolution:</span>
            <span className="text-white font-medium">{formatResolution(resolution)}</span>
          </div>
        )}

        {fileSize && (
          <div className="flex justify-between">
            <span>File Size:</span>
            <span className="text-white font-medium">
              {(fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        {safariInfo.isIOS && method === 'getusermedia-canvas' && (
          <p className="text-yellow-400 text-xs mt-2 pt-2 border-t border-dark-subtext/20">
            ⚠️ iOS limits live stream to 720p. Use "Native Camera" for full resolution.
          </p>
        )}

        {safariInfo.isIOS && safariInfo.isSafari && !safariInfo.supportsImageCapture && method === 'getusermedia-canvas' && (
          <p className="text-blue-400 text-xs mt-2 pt-2 border-t border-dark-subtext/20">
            💡 Update to iOS 18.4+ for improved capture quality
          </p>
        )}
      </div>
    </div>
  );
};

export default ResolutionDisplay;
