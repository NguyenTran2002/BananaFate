import React, { useState } from 'react';
import { BananaMetadata, RipenessStage } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';
import RipenessGuideModal from './RipenessGuideModal';
import { lookupBanana, ApiError } from '../utils/apiClient';

interface MetadataFormProps {
  imageDataUrl: string;
  onSubmit: (data: BananaMetadata) => void;
  initialMetadata: BananaMetadata;
  onRecapture: () => void;
  onClose: () => void;
}

const STAGES = Object.values(RipenessStage);

type LookupState = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

const MetadataForm: React.FC<MetadataFormProps> = ({ imageDataUrl, onSubmit, initialMetadata, onRecapture, onClose }) => {
  const [formData, setFormData] = useState<BananaMetadata>(initialMetadata);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupMessage, setLookupMessage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Reset lookup state when banana ID changes
    if (name === 'bananaId' && lookupState !== 'idle') {
      setLookupState('idle');
      setLookupMessage('');
    }
  };

  const handleLookup = async () => {
    const bananaId = formData.bananaId.trim();

    if (!bananaId) {
      setLookupMessage('Please enter a Banana ID first');
      setLookupState('error');
      return;
    }

    setLookupState('loading');
    setLookupMessage('');

    try {
      const result = await lookupBanana(bananaId);

      if (result.found && result.batchId) {
        setFormData(prev => ({ ...prev, batchId: result.batchId! }));
        setLookupState('found');
        setLookupMessage(`Found in ${result.batchId}`);
      } else {
        setLookupState('not-found');
        setLookupMessage('New banana - please enter Batch ID');
      }
    } catch (error) {
      console.error('Lookup failed:', error);
      setLookupState('error');
      if (error instanceof ApiError) {
        setLookupMessage(`Lookup failed: ${error.message}`);
      } else {
        setLookupMessage('Lookup failed - please try again');
      }
    }
  };

  const handleClearLookup = () => {
    setLookupState('idle');
    setLookupMessage('');
    setFormData(prev => ({ ...prev, batchId: '' }));
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
                {/* Capture Person */}
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

                {/* Banana ID - Now BEFORE Batch ID */}
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
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={!formData.bananaId.trim() || lookupState === 'loading'}
                    className="mt-2 w-full px-4 py-2 bg-brand-yellow text-gray-900 font-semibold rounded-md hover:bg-yellow-400 transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {lookupState === 'loading' ? 'Looking up...' : 'Lookup Batch'}
                  </button>
                  {lookupMessage && (
                    <p className={`mt-2 text-sm ${
                      lookupState === 'found' ? 'text-green-400' :
                      lookupState === 'not-found' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {lookupMessage}
                    </p>
                  )}
                </div>

                {/* Batch ID - Now AFTER Banana ID */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="batchId" className="block text-sm font-medium text-dark-subtext">Batch ID</label>
                    {lookupState === 'found' && (
                      <button
                        type="button"
                        onClick={handleClearLookup}
                        className="text-xs text-dark-subtext hover:text-brand-yellow transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="batchId"
                    name="batchId"
                    type="text"
                    value={formData.batchId}
                    onChange={handleChange}
                    required
                    readOnly={lookupState === 'found'}
                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-yellow focus:border-brand-yellow ${
                      lookupState === 'found'
                        ? 'bg-gray-700 border-green-500 text-dark-text cursor-default'
                        : 'bg-gray-800 border-gray-600 text-dark-text'
                    }`}
                  />
                  {lookupState === 'found' && (
                    <p className="mt-1 text-xs text-green-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Auto-filled from lookup
                    </p>
                  )}
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