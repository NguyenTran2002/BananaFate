import React, { useRef, useEffect, useCallback } from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Prefer rear camera
          audio: false,
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
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
  }, [onError, stopCamera]);

  const handleCaptureClick = useCallback(() => {
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
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        onCapture(imageDataUrl);
      } else {
        onError('Could not get canvas context to capture image.');
      }
    }
  }, [onCapture, onError]);
  
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <p className="absolute top-4 text-center text-sm font-semibold bg-black/50 px-3 py-1 rounded-full">
              Align banana within the square
            </p>
            <BananaGuideIcon
              className="w-4/5 h-auto opacity-30"
            />
          </div>
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
        <button
          onClick={onClose}
          className="mt-6 font-semibold text-dark-subtext hover:text-white transition-colors py-2"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;