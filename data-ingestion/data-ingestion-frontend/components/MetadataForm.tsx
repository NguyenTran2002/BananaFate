import React, { useState } from 'react';
import { BananaMetadata, RipenessStage } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';
import RipenessGuideModal from './RipenessGuideModal';

interface MetadataFormProps {
  imageDataUrl: string;
  onSubmit: (data: BananaMetadata) => void;
  initialMetadata: BananaMetadata;
  onRecapture: () => void;
  onClose: () => void;
}

const STAGES = Object.values(RipenessStage);

const MetadataForm: React.FC<MetadataFormProps> = ({ imageDataUrl, onSubmit, initialMetadata, onRecapture, onClose }) => {
  const [formData, setFormData] = useState<BananaMetadata>(initialMetadata);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.batchId.trim() && formData.bananaId.trim() && formData.capturePerson.trim() && formData.stage) {
      onSubmit(formData);
    }
  };

  return (
    <>
      <RipenessGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <div className="w-full h-full">
        <div className="w-full h-full p-6 overflow-y-auto no-scrollbar">
          <div className="max-w-sm mx-auto">
            {/* Framed Image */}
            <div className="bg-brand-yellow p-1.5 rounded-lg shadow-xl mb-6">
              <img
                src={imageDataUrl}
                alt="Banana preview"
                className="w-full aspect-square object-cover rounded-md"
              />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="capturePerson" className="block text-sm font-medium text-dark-subtext">Capture Person</label>
                  <input
                    id="capturePerson"
                    name="capturePerson"
                    type="text"
                    value={formData.capturePerson}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-text focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow"
                  />
                </div>
                <div>
                  <label htmlFor="batchId" className="block text-sm font-medium text-dark-subtext">Batch ID</label>
                  <input
                    id="batchId"
                    name="batchId"
                    type="text"
                    value={formData.batchId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-text focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow"
                  />
                </div>
                <div>
                  <label htmlFor="bananaId" className="block text-sm font-medium text-dark-subtext">Banana ID</label>
                  <input
                    id="bananaId"
                    name="bananaId"
                    type="text"
                    value={formData.bananaId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-text focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow"
                  />
                </div>
                <div>
                  <label htmlFor="captureTime" className="block text-sm font-medium text-dark-subtext">Capture Time</label>
                  <input
                    id="captureTime"
                    name="captureTime"
                    type="text"
                    value={formData.captureTime}
                    readOnly
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-subtext cursor-default"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="stage" className="block text-sm font-medium text-dark-subtext">Stage</label>
                    <button
                      type="button"
                      onClick={() => setIsGuideOpen(true)}
                      className="text-dark-subtext hover:text-brand-yellow transition-colors p-1 -mr-1"
                      aria-label="Open ripeness guide"
                    >
                      <QuestionMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <select
                    id="stage"
                    name="stage"
                    value={formData.stage}
                    onChange={handleChange}
                    required
                    className="block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-text focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow"
                  >
                    <option value="" disabled>Select a ripeness stage...</option>
                    {STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-dark-subtext">Optional Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-dark-text focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!formData.batchId.trim() || !formData.bananaId.trim() || !formData.capturePerson.trim() || !formData.stage}
                className="w-full mt-8 bg-brand-yellow text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-400 transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                <UploadIcon className="w-6 h-6 mr-2" />
                Submit and Upload
              </button>
              <button
                type="button"
                onClick={onRecapture}
                className="w-full mt-4 bg-gray-700 text-dark-text font-bold py-3 px-4 rounded-lg shadow-md hover:bg-gray-600 transition-colors"
              >
                Re-capture
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 font-semibold text-dark-subtext hover:text-white transition-colors py-2"
              >
                Cancel and Go Home
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default MetadataForm;