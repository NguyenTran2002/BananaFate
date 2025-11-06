import React, { useRef, useEffect, useCallback, useState } from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import {
  detectSafariVersion,
  getStreamResolution,
  getCameraCapabilities,
  StreamResolution,
  requestHighResolutionStream
} from '../utils/cameraCapabilities';
import ResolutionDisplay from './ResolutionDisplay';
import { cropToSquare } from '../utils/imageUtils';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
  method?: 'imagecapture' | 'getusermedia-canvas';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError, onClose, method }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [resolution, setResolution] = useState<StreamResolution | null>(null);
  const [supportsImageCapture, setSupportsImageCapture] = useState(false);
  const safariInfo = detectSafariVersion();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        // Request high resolution stream
        const mediaStream = await requestHighResolutionStream();
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Detect ImageCapture API support and respect method preference
        // Only use ImageCapture if method is 'imagecapture' (or undefined for backward compatibility)
        const shouldUseImageCapture =
          (!method || method === 'imagecapture') &&
          'ImageCapture' in window &&
          safariInfo.supportsImageCapture;
        setSupportsImageCapture(shouldUseImageCapture);

        // Get and log stream resolution
        const streamRes = await getStreamResolution(mediaStream);
        setResolution(streamRes);

        // Log camera capabilities
        const capabilities = await getCameraCapabilities(mediaStream);
        console.log('Camera started:', {
          method: shouldUseImageCapture ? 'ImageCapture API' : 'Canvas fallback',
          requestedMethod: method || 'auto-detect',
          streamResolution: `${streamRes.width}x${streamRes.height}`,
          megapixels: streamRes.megapixels,
          capabilities: capabilities
        });

      } catch (err) {
        console.error("Error accessing camera:", err);
        onError('Could not access camera. Please check permissions and try again.');
      }
    };

    startCamera();

    // Cleanup function to stop the camera when the component unmounts
    return () => {
      stopCamera();
    };
  }, [onError, stopCamera, safariInfo.supportsImageCapture]);

  const handleCaptureClick = useCallback(async () => {
    // Try ImageCapture API first (Safari 18.4+, Chrome, Edge)
    if (supportsImageCapture && streamRef.current) {
      try {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(videoTrack);

        console.log('Using ImageCapture API for high-quality capture');

        // takePhoto() captures at full camera resolution
        const blob = await imageCapture.takePhoto();

        console.log('ImageCapture blob:', {
          size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
          type: blob.type
        });

        // Log actual capture resolution for debugging
        const tempImg = new Image();
        const blobUrl = URL.createObjectURL(blob);
        tempImg.onload = () => {
          console.log('=== ImageCapture Resolution ===');
          console.log('Captured resolution:', tempImg.width, 'x', tempImg.height);
          console.log('Captured megapixels:', ((tempImg.width * tempImg.height) / 1000000).toFixed(2));
          console.log('Stream resolution was:', resolution?.width, 'x', resolution?.height);
          console.log('Resolution difference:', tempImg.width - (resolution?.width || 0), 'pixels wider');
          console.log('===============================');
          URL.revokeObjectURL(blobUrl);
        };
        tempImg.src = blobUrl;

        // Convert blob to data URL, then crop to square
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const dataUrl = reader.result as string;
            // Crop to square to match viewport display
            const croppedDataUrl = await cropToSquare(dataUrl);
            console.log('ImageCapture: Cropped to square');
            onCapture(croppedDataUrl);
          } catch (cropErr) {
            console.error('Failed to crop image:', cropErr);
            onError('Failed to process captured image');
          }
        };
        reader.onerror = () => {
          onError('Failed to read captured image');
        };
        reader.readAsDataURL(blob);
        return;
      } catch (err) {
        console.warn('ImageCapture failed, falling back to canvas:', err);
        // Fall through to canvas method
      }
    }

    // Fallback: Canvas capture from video stream
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Determine the size of the largest possible square from the center of the video feed
      const size = Math.min(videoWidth, videoHeight);

      // Set the canvas dimensions to the square size
      canvas.width = size;
      canvas.height = size;

      // Calculate the starting coordinates to crop from the center of the video
      const sx = (videoWidth - size) / 2;
      const sy = (videoHeight - size) / 2;

      const context = canvas.getContext('2d');

      if (context) {
        // Draw the cropped square from the video onto the canvas
        context.drawImage(
          video,
          sx,   // Source X
          sy,   // Source Y
          size, // Source Width
          size, // Source Height
          0,    // Destination X
          0,    // Destination Y
          size, // Destination Width
          size  // Destination Height
        );

        // Use higher quality JPEG encoding (0.95 instead of default 0.92)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

        console.log('=== Canvas Capture Resolution ===');
        console.log('Canvas resolution:', size, 'x', size);
        console.log('Video resolution:', videoWidth, 'x', videoHeight);
        console.log('Stream resolution:', resolution?.width, 'x', resolution?.height);
        console.log('Canvas megapixels:', ((size * size) / 1000000).toFixed(2));
        console.log('Quality:', 0.95);
        console.log('Estimated size:', `${(imageDataUrl.length / 1024 / 1024 * 0.75).toFixed(2)} MB`);
        console.log('=================================');

        onCapture(imageDataUrl);
      } else {
        onError('Could not get canvas context to capture image.');
      }
    }
  }, [onCapture, onError, supportsImageCapture]);
  
  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Camera Viewport */}
      <div className="w-full aspect-square relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // Muted is required for autoplay in most browsers
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-dashed border-brand-yellow rounded-lg" />

          {/* Quality Badge - Top */}
          {resolution && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 px-2.5 py-1.5 rounded-full flex-nowrap">
              <span className="text-[10px] sm:text-xs font-semibold text-brand-yellow whitespace-nowrap">
                {supportsImageCapture ? '📸 High' : '📹 Med'}
              </span>
              <span className="text-[10px] sm:text-xs text-white whitespace-nowrap">
                {supportsImageCapture ? 'Full Sensor' : `${resolution.width}×${resolution.height}`}
              </span>
            </div>
          )}

          {/* Banana Guide Icon - Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <BananaGuideIcon className="w-4/5 h-auto opacity-30" />
          </div>

          {/* Instruction Text - Bottom */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[10px] sm:text-xs font-semibold bg-black/50 px-3 py-1 rounded-full text-white whitespace-nowrap">
            Align banana within the square
          </p>
        </div>
      </div>

      {/* Capture Controls */}
      <div className="flex-grow w-full flex flex-col items-center justify-center p-4">
        {/* Capture Button */}
        <button
          onClick={handleCaptureClick}
          className="w-20 h-20 rounded-full border-4 border-white bg-white/30 hover:bg-white/50 transition-colors"
          aria-label="Capture photo"
        />
      </div>
    </div>
  );
};

export default CameraCapture;