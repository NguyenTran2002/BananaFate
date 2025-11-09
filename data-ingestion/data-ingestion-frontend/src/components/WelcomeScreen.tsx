import React from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ChartIcon } from './icons/ChartIcon';

interface WelcomeScreenProps {
  onStart: () => void;
  onShowProgress: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onShowProgress }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <BananaGuideIcon className="w-72 h-auto text-brand-yellow mb-6" />
      <h2 className="text-3xl font-bold text-dark-text mb-2">Ready to Capture?</h2>
      <p className="text-dark-subtext max-w-xs mb-8">
        Help us train our model by capturing photos of bananas. Follow the on-screen guide for best results.
      </p>
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={onStart}
          className="w-full bg-brand-yellow text-gray-900 font-bold py-4 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors flex items-center justify-center text-lg"
          aria-label="Start capture session"
        >
          <CameraIcon className="w-6 h-6 mr-3" />
          Start Capture Session
        </button>
        <button
          onClick={onShowProgress}
          className="w-full bg-gray-700 text-dark-text font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-600 transition-colors text-base flex items-center justify-center"
          aria-label="Show data collection progress"
        >
          <ChartIcon className="w-5 h-5 mr-2" />
          Show Collection Progress
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;