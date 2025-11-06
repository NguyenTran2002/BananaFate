import React from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

interface PreviewScreenProps {
  imageDataUrl: string;
  onConfirm: () => void;
  onRetake: () => void;
  onClose: () => void;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({ imageDataUrl, onConfirm, onRetake, onClose }) => {
  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Image Viewport */}
      <div className="w-full aspect-square relative bg-black flex-shrink-0">
        <img
          src={imageDataUrl}
          alt="Captured banana preview"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <BananaGuideIcon className="w-4/5 h-auto opacity-30 text-white" />
        </div>
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
            onClick={onRetake}
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