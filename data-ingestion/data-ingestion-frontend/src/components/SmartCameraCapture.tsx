import React, { useState, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import NativeFileCapture from './NativeFileCapture';
import {
  detectSafariVersion,
  getRecommendedMethod,
  detectCameraMethods,
  CaptureMethod,
  CameraMethod
} from '../utils/cameraCapabilities';

interface SmartCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

/**
 * Smart camera capture component that automatically selects the best
 * capture method for the device and allows users to manually override
 */
const SmartCameraCapture: React.FC<SmartCameraCaptureProps> = ({ onCapture, onError, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState<CaptureMethod | 'auto'>('auto');
  const [availableMethods, setAvailableMethods] = useState<CameraMethod[]>([]);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const safariInfo = detectSafariVersion();

  useEffect(() => {
    // Detect available capture methods
    detectCameraMethods().then(setAvailableMethods);
  }, []);

  // Determine which capture method to use
  const getActiveMethod = (): CaptureMethod => {
    if (selectedMethod === 'auto') {
      return getRecommendedMethod();
    }
    return selectedMethod;
  };

  const activeMethod = getActiveMethod();

  // Method display names
  const methodDisplayNames: Record<CaptureMethod, string> = {
    'imagecapture': 'ImageCapture API',
    'native-input': 'Native Camera',
    'getusermedia-canvas': 'Live Preview'
  };

  // Method descriptions
  const methodDescriptions: Record<CaptureMethod, string> = {
    'imagecapture': 'High quality with live preview (Safari 18.4+)',
    'native-input': 'Full device resolution (best for iOS)',
    'getusermedia-canvas': 'Live preview with overlay (up to 720p on iOS)'
  };

  // Method icons (simple emoji for now)
  const methodIcons: Record<CaptureMethod, string> = {
    'imagecapture': '📸',
    'native-input': '🎯',
    'getusermedia-canvas': '📹'
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Method Selector Header */}
      <div className="bg-dark-card border-b border-dark-subtext/20 p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-dark-subtext mb-1">Capture Method:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-yellow">
                {selectedMethod === 'auto'
                  ? `Auto (${methodDisplayNames[activeMethod]})`
                  : methodDisplayNames[activeMethod]
                }
              </span>
              {safariInfo.isIOS && activeMethod === 'native-input' && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                  Best Quality
                </span>
              )}
              {safariInfo.isIOS && activeMethod === 'getusermedia-canvas' && (
                <span className="bg-yellow-500 text-dark-bg text-xs px-2 py-0.5 rounded">
                  720p Max
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowMethodSelector(!showMethodSelector)}
            className="text-brand-yellow text-sm font-medium hover:text-brand-yellow/80 transition-colors"
          >
            {showMethodSelector ? 'Hide Options' : 'Change'}
          </button>
        </div>

        {/* Method Selector Dropdown */}
        {showMethodSelector && (
          <div className="mt-3 space-y-2">
            {/* Auto option */}
            <button
              onClick={() => {
                setSelectedMethod('auto');
                setShowMethodSelector(false);
              }}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedMethod === 'auto'
                  ? 'border-brand-yellow bg-brand-yellow/10'
                  : 'border-dark-subtext/20 hover:border-dark-subtext/40'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">⚡</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Auto (Recommended)</p>
                  <p className="text-xs text-dark-subtext mt-1">
                    Automatically selects best method for your device
                  </p>
                  <p className="text-xs text-brand-yellow mt-1">
                    → Will use: {methodDisplayNames[getRecommendedMethod()]}
                  </p>
                </div>
              </div>
            </button>

            {/* Available methods */}
            {availableMethods.map((method) => (
              <button
                key={method.name}
                onClick={() => {
                  setSelectedMethod(method.name);
                  setShowMethodSelector(false);
                }}
                disabled={!method.available}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedMethod === method.name
                    ? 'border-brand-yellow bg-brand-yellow/10'
                    : 'border-dark-subtext/20 hover:border-dark-subtext/40'
                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{methodIcons[method.name]}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{methodDisplayNames[method.name]}</p>
                    <p className="text-xs text-dark-subtext mt-1">
                      {methodDescriptions[method.name]}
                    </p>
                    {method.resolutionInfo && (
                      <p className="text-xs text-brand-yellow mt-1">
                        {method.resolutionInfo}
                      </p>
                    )}
                  </div>
                  {method.quality === 'high' && (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded self-start">
                      High
                    </span>
                  )}
                  {method.quality === 'medium' && (
                    <span className="bg-yellow-500 text-dark-bg text-xs px-2 py-0.5 rounded self-start">
                      Med
                    </span>
                  )}
                </div>
              </button>
            ))}

            {/* iOS-specific recommendations */}
            {safariInfo.isIOS && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  💡 <strong>iOS Tip:</strong> {
                    safariInfo.supportsImageCapture
                      ? 'ImageCapture API is available on your iOS version for improved quality with live preview.'
                      : 'For best quality, use "Native Camera" which captures at full device resolution. Update to iOS 18.4+ for ImageCapture API support.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render appropriate capture component */}
      <div className="flex-1 overflow-auto">
        {activeMethod === 'native-input' ? (
          <NativeFileCapture
            key="native-input"
            onCapture={onCapture}
            onError={onError}
            onClose={onClose}
          />
        ) : (
          <CameraCapture
            key={activeMethod}
            method={activeMethod as 'imagecapture' | 'getusermedia-canvas'}
            onCapture={onCapture}
            onError={onError}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default SmartCameraCapture;
