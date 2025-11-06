import React from 'react';
import { BackIcon } from './icons/BackIcon';
import { CloseIcon } from './icons/CloseIcon';

interface NavigationHeaderProps {
  onBack?: () => void;
  onClose?: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ onBack, onClose }) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Go back"
          >
            <BackIcon className="w-6 h-6" />
          </button>
        )}
      </div>
      <div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NavigationHeader;
