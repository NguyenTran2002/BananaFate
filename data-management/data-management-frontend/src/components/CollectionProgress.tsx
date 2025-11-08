import React from 'react';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

interface CollectionProgressProps {
  totalImages: number;
  targetImages?: number;
}

const CollectionProgress: React.FC<CollectionProgressProps> = ({
  totalImages,
  targetImages = 500
}) => {
  const progressPercentage = Math.min((totalImages / targetImages) * 100, 100);

  const stages = [
    { name: 'Under Ripe', color: '#7DBA29', min: 0, max: 100 },
    { name: 'Barely Ripe', color: '#D4DE21', min: 100, max: 200 },
    { name: 'Ripe', color: '#FFD700', min: 200, max: 300 },
    { name: 'Very Ripe', color: '#E8B500', min: 300, max: 400 },
    { name: 'Over Ripe', color: '#8B4513', min: 400, max: 500 }
  ];

  const getCurrentStage = () => {
    const stage = stages.find(s => totalImages >= s.min && totalImages < s.max);
    return stage || stages[stages.length - 1];
  };

  const getStageOpacity = (stageMin: number, stageMax: number) => {
    if (totalImages < stageMin) {
      // Future stage - gray and transparent
      return { opacity: 0.2, color: '#9CA3AF' };
    } else if (totalImages >= stageMax) {
      // Completed stage - full color
      return { opacity: 1, color: null };
    } else {
      // Current stage - partial opacity based on progress within stage
      const stageProgress = (totalImages - stageMin) / (stageMax - stageMin);
      return { opacity: 0.3 + (0.7 * stageProgress), color: null };
    }
  };

  const currentStage = getCurrentStage();

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Collection Progress
        </h2>
        <p className="text-sm text-gray-600">
          Track your journey to 500 images across all ripeness stages
        </p>
      </div>

      {/* Main Progress Display */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-3xl font-bold" style={{ color: currentStage.color }}>
            {totalImages} <span className="text-gray-400">/ {targetImages}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Current stage: <span className="font-semibold" style={{ color: currentStage.color }}>
              {currentStage.name}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-700">
            {progressPercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {totalImages >= targetImages ? 'Complete!' : `${targetImages - totalImages} to go`}
          </div>
        </div>
      </div>

      {/* Banana Icons Progress Bar */}
      <div className="space-y-4">
        {/* Icons Row */}
        <div className="flex justify-between items-end gap-2">
          {stages.map((stage, index) => {
            const { opacity, color } = getStageOpacity(stage.min, stage.max);
            return (
              <div key={stage.name} className="flex-1 flex flex-col items-center">
                <div className="relative w-full" style={{ maxWidth: '80px' }}>
                  {/* Banana Icon */}
                  <BananaGuideIcon
                    className="w-full h-auto transition-all duration-500"
                    style={{
                      color: color || stage.color,
                      opacity: opacity,
                      filter: totalImages < stage.min ? 'grayscale(100%)' : 'none'
                    }}
                  />

                  {/* Progress indicator for current stage */}
                  {totalImages >= stage.min && totalImages < stage.max && (
                    <div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                      style={{ animation: 'pulse 2s ease-in-out infinite' }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                    </div>
                  )}

                  {/* Checkmark for completed stages */}
                  {totalImages >= stage.max && (
                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>

                {/* Stage label */}
                <div className="mt-2 text-center">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{
                      color: totalImages >= stage.min ? stage.color : '#9CA3AF'
                    }}
                  >
                    {stage.max}
                  </div>
                  <div className="text-[10px] text-gray-500 leading-tight">
                    {stage.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercentage}%`,
              background: `linear-gradient(to right,
                #7DBA29 0%, #7DBA29 20%,
                #D4DE21 20%, #D4DE21 40%,
                #FFD700 40%, #FFD700 60%,
                #E8B500 60%, #E8B500 80%,
                #8B4513 80%, #8B4513 100%
              )`
            }}
          />
        </div>

        {/* Milestone markers on progress bar */}
        <div className="relative flex justify-between px-0">
          {[0, 100, 200, 300, 400, 500].map((milestone, idx) => (
            <div
              key={milestone}
              className="text-xs text-gray-400 font-medium"
              style={{
                color: totalImages >= milestone ? '#4B5563' : '#9CA3AF',
                fontWeight: totalImages >= milestone ? 600 : 400
              }}
            >
              {milestone}
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Messages */}
      {totalImages >= targetImages && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg text-center">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-green-800 font-bold text-lg">
            Congratulations! You've reached your collection goal!
          </p>
          <p className="text-green-700 text-sm mt-1">
            {totalImages} images collected across all ripeness stages
          </p>
        </div>
      )}

      {totalImages < targetImages && totalImages >= targetImages * 0.8 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg text-center">
          <div className="text-2xl mb-2">🍌</div>
          <p className="text-yellow-800 font-bold">
            Almost there! Just {targetImages - totalImages} more images to go!
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            You're in the {currentStage.name} stage
          </p>
        </div>
      )}

      {totalImages < targetImages && totalImages >= targetImages * 0.5 && totalImages < targetImages * 0.8 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg text-center">
          <p className="text-blue-800 font-semibold">
            Great progress! You're halfway there
          </p>
          <p className="text-blue-700 text-sm mt-1">
            {totalImages} images collected, {targetImages - totalImages} remaining
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default CollectionProgress;
