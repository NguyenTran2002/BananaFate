import React from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { useImageZoom } from '../hooks/useImageZoom';

interface PreviewScreenProps {
  imageDataUrl: string;
  onConfirm: () => void;
  onRetake: () => void;
  onClose: () => void;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({ imageDataUrl, onConfirm, onRetake, onClose }) => {
  const {
    scale,
    position,
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useImageZoom();

  const handleRetake = () => {
    resetZoom();
    onRetake();
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Image Viewport */}
      <div
        ref={containerRef}
        className="w-full aspect-square relative bg-black flex-shrink-0 overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageDataUrl}
          alt="Captured banana preview"
          className="w-full h-full object-cover"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
            transition: 'none',
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            opacity: scale > 1 ? 0 : 0.3,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          <BananaGuideIcon className="w-4/5 h-auto text-white" />
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col space-y-2 pointer-events-auto">
          <button
            onClick={zoomIn}
            disabled={scale >= 4}
            className="w-12 h-12 bg-gray-900 bg-opacity-70 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            disabled={scale <= 1}
            className="w-12 h-12 bg-gray-900 bg-opacity-70 text-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* Zoom Level Indicator */}
        {scale > 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            {scale.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex-grow w-full flex flex-col items-center justify-center p-4 space-y-4">
        <button
          onClick={onConfirm}
          className="w-full max-w-xs bg-brand-yellow text-gray-900 font-bold py-4 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors flex items-center justify-center text-lg"
        >
          Confirm & Continue
        </button>

        <div className="flex items-center space-x-6">
          <button
            onClick={handleRetake}
            className="font-semibold text-dark-subtext hover:text-white transition-colors py-2 px-4"
          >
            Retry
          </button>
          <button
            onClick={onClose}
            className="font-semibold text-dark-subtext hover:text-white transition-colors py-2 px-4"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewScreen;