import React, { useRef, useState, useCallback, useEffect } from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { getImageResolution, StreamResolution, detectSafariVersion } from '../utils/cameraCapabilities';
import ResolutionDisplay from './ResolutionDisplay';
import { cropToSquare } from '../utils/imageUtils';

interface NativeFileCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

/**
 * Native camera capture using <input type="file">
 * Best for iOS Safari to get full device camera resolution (12MP+)
 * Shows static orientation guide before capture and verification after
 */
const NativeFileCapture: React.FC<NativeFileCaptureProps> = ({ onCapture, onError, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState<StreamResolution | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const safariInfo = detectSafariVersion();

  // Auto-open camera on mount for iOS users
  useEffect(() => {
    if (safariInfo.isIOS && !previewUrl) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [safariInfo.isIOS, previewUrl]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file');
      return;
    }

    setIsProcessing(true);
    setCapturedFile(file);

    try {
      // Get resolution info
      const resInfo = await getImageResolution(file);
      setResolution(resInfo);

      // Log capture details
      console.log('Native camera capture:', {
        filename: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        resolution: `${resInfo.width}x${resInfo.height}`,
        megapixels: resInfo.megapixels,
        lastModified: new Date(file.lastModified).toISOString()
      });

      // Convert to data URL for preview and App.tsx compatibility
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        onError('Failed to read image file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing image:', err);
      onError('Failed to process image');
      setIsProcessing(false);
    }
  }, [onError]);

  const handleCaptureClick = useCallback(() => {
    // Reset file input to allow same file selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  }, []);

  const handleRetake = useCallback(() => {
    setPreviewUrl(null);
    setCapturedFile(null);
    setResolution(null);
    // Trigger camera again
    setTimeout(() => {
      handleCaptureClick();
    }, 100);
  }, [handleCaptureClick]);

  const handleConfirm = useCallback(async () => {
    if (previewUrl) {
      try {
        // Crop to square to match viewport display
        const croppedDataUrl = await cropToSquare(previewUrl);
        console.log('Native capture: Cropped to square');
        onCapture(croppedDataUrl);
      } catch (err) {
        console.error('Failed to crop image:', err);
        onError('Failed to process image');
      }
    } else {
      onError('No image to confirm');
    }
  }, [previewUrl, onCapture, onError]);

  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Hidden file input - iOS Safari will show camera option */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Content Area */}
      <div className="w-full aspect-square relative bg-black border-2 border-dashed border-brand-yellow rounded-lg overflow-hidden">
        {!previewUrl && !isProcessing && (
          // Static orientation guide (before capture)
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            <BananaGuideIcon className="w-4/5 h-auto opacity-30" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4 flex flex-col items-center gap-3">
              <p className="text-center text-[10px] sm:text-xs font-semibold bg-black/50 px-3 py-1 rounded-full whitespace-nowrap">
                Position banana with stem pointing LEFT
              </p>
              <div className="text-xs text-dark-subtext bg-black/50 px-4 py-3 rounded-lg max-w-xs space-y-1">
                <p>✓ Place banana horizontally</p>
                <p>✓ Stem on the LEFT side</p>
                <p>✓ Fill the frame</p>
                <p>✓ Ensure good lighting</p>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          // Loading state
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow mb-4"></div>
            <p className="text-sm">Processing image...</p>
          </div>
        )}

        {previewUrl && (
          // Preview with overlay verification
          <>
            <img src={previewUrl} alt="Captured" className="w-full h-full object-cover" />
            {/* Overlay to verify orientation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-dashed border-brand-yellow rounded-lg" />

              {/* Quality Badge - Top */}
              {resolution && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 px-2.5 py-1.5 rounded-full flex-nowrap">
                  <span className="text-[10px] sm:text-xs font-semibold text-brand-yellow whitespace-nowrap">
                    ✨ Best
                  </span>
                  <span className="text-[10px] sm:text-xs text-white whitespace-nowrap">
                    {resolution.width}×{resolution.height}
                  </span>
                </div>
              )}

              {/* Banana Guide Icon - Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <BananaGuideIcon className="w-4/5 h-auto opacity-20" />
              </div>

              {/* Verification Text - Bottom */}
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[10px] sm:text-xs font-semibold bg-black/70 text-white px-3 py-1 rounded-full whitespace-nowrap">
                Verify: Is the stem on the LEFT?
              </p>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex-grow w-full flex flex-col items-center justify-center p-4 gap-3">
        {!previewUrl ? (
          // Initial capture button
          <>
            <button
              onClick={handleCaptureClick}
              disabled={isProcessing}
              className="bg-brand-yellow text-dark-bg font-semibold px-8 py-4 rounded-lg hover:bg-brand-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isProcessing ? 'Processing...' : 'Open Camera'}
            </button>
            <p className="text-sm text-dark-subtext text-center max-w-xs">
              {safariInfo.isIOS
                ? 'Uses your device camera for full resolution capture'
                : 'Opens your camera or file picker'}
            </p>
          </>
        ) : (
          // Confirm/Retake buttons after capture
          <>
            <button
              onClick={handleConfirm}
              className="bg-green-500 text-white font-semibold px-8 py-4 rounded-lg hover:bg-green-600 transition-colors text-lg w-full max-w-xs"
            >
              ✓ Confirm - Stem is on LEFT
            </button>
            <button
              onClick={handleRetake}
              className="bg-yellow-500 text-dark-bg font-semibold px-8 py-4 rounded-lg hover:bg-yellow-600 transition-colors text-lg w-full max-w-xs"
            >
              ↻ Retake - Wrong Orientation
            </button>
            <p className="text-xs text-dark-subtext text-center mt-2">
              Verify stem is on the LEFT before confirming
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default NativeFileCapture;
