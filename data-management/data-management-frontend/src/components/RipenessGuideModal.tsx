import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import RipenessGuideVisual from './RipenessGuideVisual';

interface RipenessGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RipenessGuideModal: React.FC<RipenessGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ripeness-guide-title"
    >
      <div
        className="bg-ocean-surface rounded-2xl shadow-2xl max-w-md w-full relative flex flex-col border border-gray-700/50 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex-shrink-0 relative">
            <h2 id="ripeness-guide-title" className="text-2xl font-bold text-brand-yellow text-center">
              Banana Ripeness Guide
            </h2>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 text-dark-subtext hover:bg-gray-700/70 hover:text-white transition-colors"
              aria-label="Close ripeness guide"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="px-6 pb-4 flex-grow overflow-y-auto no-scrollbar">
            <RipenessGuideVisual />
        </div>

        <div className="p-6 flex-shrink-0 border-t border-gray-700/50">
            <button
              onClick={onClose}
              className="w-full bg-brand-yellow text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-400 transition-colors"
            >
              Got it!
            </button>
        </div>
      </div>
    </div>
  );
};

export default RipenessGuideModal;
