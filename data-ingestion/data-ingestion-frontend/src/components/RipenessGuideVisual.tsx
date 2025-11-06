import React from 'react';
import { RipenessStage } from '../types';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

const stageDetails = [
  {
    stage: RipenessStage.UNDER_RIPE,
    color: 'text-[#7DBA29]',
    description: 'Very firm; dark green to medium-green.',
  },
  {
    stage: RipenessStage.BARELY_RIPE,
    color: 'text-[#D4DE21]',
    description: 'Firm; pale yellow with light green at the top.',
  },
  {
    stage: RipenessStage.RIPE,
    color: 'text-brand-yellow',
    description: 'Easily peel-able; medium-yellow, no (or few) brown spots.',
  },
  {
    stage: RipenessStage.VERY_RIPE,
    color: 'text-[#E8B500]',
    description: 'Soft but not mushy; a mix of yellow with brown spots.',
  },
  {
    stage: RipenessStage.OVER_RIPE,
    color: 'text-[#8B4513]',
    description: 'Soft, mushy interior; highly spotted with brown or entirely brown.',
  },
  {
    stage: RipenessStage.DEATH,
    color: 'text-gray-500',
    description: 'Completely brown/black, mushy, and possibly moldy.',
  },
];


const RipenessGuideVisual: React.FC = () => {
  return (
    <div className="space-y-3">
      {stageDetails.map(({ stage, color, description }) => (
        <div key={stage} className="flex items-center gap-4 p-3 bg-ocean-deep rounded-lg">
          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
            <BananaGuideIcon className={`w-full h-auto ${color}`} />
          </div>
          <div>
            <p className="font-bold text-dark-text">{stage}</p>
            <p className="text-sm text-dark-subtext">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RipenessGuideVisual;