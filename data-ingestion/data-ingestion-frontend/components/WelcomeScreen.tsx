import React from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { CameraIcon } from './icons/CameraIcon';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <BananaGuideIcon className="w-72 h-auto text-brand-yellow mb-6" />
      <h2 className="text-3xl font-bold text-dark-text mb-2">Ready to Capture?</h2>
      <p className="text-dark-subtext max-w-xs mb-8">
        Help us train our model by capturing photos of bananas. Follow the on-screen guide for best results.
      </p>
      <button
        onClick={onStart}
        className="w-full max-w-xs bg-brand-yellow text-gray-900 font-bold py-4 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors flex items-center justify-center text-lg"
        aria-label="Start capture session"
      >
        <CameraIcon className="w-6 h-6 mr-3" />
        Start Capture Session
      </button>
    </div>
  );
};

export default WelcomeScreen;