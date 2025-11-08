import React from 'react';
import { RipenessStage } from '../types';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

const stageDetails = [
  {
    stage: RipenessStage.UNDER_RIPE,
    color: 'text-[#7DBA29]',
    description: 'More green than yellow or completely green',
  },
  {
    stage: RipenessStage.BARELY_RIPE,
    color: 'text-[#D4DE21]',
    description: 'More yellow than green',
  },
  {
    stage: RipenessStage.RIPE,
    color: 'text-brand-yellow',
    description: 'Yellow with minimal green tips or full yellow',
  },
  {
    stage: RipenessStage.VERY_RIPE,
    color: 'text-[#E8B500]',
    description: 'Full yellow with spots',
  },
  {
    stage: RipenessStage.OVER_RIPE,
    color: 'text-[#8B4513]',
    description: 'Full yellow with brown patches',
  },
  {
    stage: RipenessStage.DEATH,
    color: 'text-gray-500',
    description: 'Nearly completely brown',
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
