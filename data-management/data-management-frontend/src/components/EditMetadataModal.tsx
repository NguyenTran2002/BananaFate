/**
 * Edit Metadata Modal
 * Form to edit image metadata with before/after confirmation
 */

import React, { useState } from 'react';
import { ImageDocument, UpdateMetadataRequest, RipenessStage } from '../types';
import { updateMetadata } from '../utils/apiClient';
import { QuestionMarkIcon } from './icons/QuestionMarkIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import RipenessGuideModal from './RipenessGuideModal';

interface EditMetadataModalProps {
  image: ImageDocument;
  onClose: () => void;
  onSuccess: (updated: ImageDocument) => void;
}

type EditStep = 'form' | 'confirming' | 'success';

export function EditMetadataModal({ image, onClose, onSuccess }: EditMetadataModalProps) {
  const [step, setStep] = useState<EditStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Form state (initialized with current values)
  const [formData, setFormData] = useState({
    batchId: image.batchId,
    bananaId: image.bananaId,
    captureTime: image.captureTime,
    stage: image.stage,
    notes: image.notes,
  });

  // Result state
  const [before, setBefore] = useState<ImageDocument | null>(null);
  const [after, setAfter] = useState<ImageDocument | null>(null);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasChanges = () => {
    return (
      formData.batchId !== image.batchId ||
      formData.bananaId !== image.bananaId ||
      formData.captureTime !== image.captureTime ||
      formData.stage !== image.stage ||
      formData.notes !== image.notes
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges()) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates: UpdateMetadataRequest = {};

      // Only include changed fields
      if (formData.batchId !== image.batchId) updates.batchId = formData.batchId;
      if (formData.bananaId !== image.bananaId) updates.bananaId = formData.bananaId;
      if (formData.captureTime !== image.captureTime) updates.captureTime = formData.captureTime;
      if (formData.stage !== image.stage) updates.stage = formData.stage;
      if (formData.notes !== image.notes) updates.notes = formData.notes;

      const result = await updateMetadata(image._id, updates);

      setBefore(result.before);
      setAfter(result.after);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to update metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (after) {
      onSuccess(after);
    }
    onClose();
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  // Form Step
  if (step === 'form') {
    return (
      <div
        className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-ocean-surface rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          <h2 className="text-3xl font-bold text-brand-yellow mb-6">Edit Metadata</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Batch ID */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">Batch ID</label>
              <input
                type="text"
                value={formData.batchId}
                onChange={(e) => handleChange('batchId', e.target.value)}
                className="w-full px-4 py-2 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                         text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                required
              />
            </div>

            {/* Banana ID */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">Banana ID</label>
              <input
                type="text"
                value={formData.bananaId}
                onChange={(e) => handleChange('bananaId', e.target.value)}
                className="w-full px-4 py-2 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                         text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                required
              />
            </div>

            {/* Capture Time */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Capture Time (ISO 8601)
              </label>
              <input
                type="text"
                value={formData.captureTime}
                onChange={(e) => handleChange('captureTime', e.target.value)}
                className="w-full px-4 py-2 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                         text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                required
              />
              <p className="text-xs text-dark-subtext mt-1">Current: {formatDate(formData.captureTime)}</p>
            </div>

            {/* Stage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-dark-text">Ripeness Stage</label>
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
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                className="w-full px-4 py-2 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                         text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-yellow"
                required
              >
                {Object.values(RipenessStage).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                         text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-ocean-deep border border-dark-subtext/30 text-dark-text
                         rounded-lg hover:bg-ocean-deep/70 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-brand-yellow text-ocean-deep font-semibold rounded-lg
                         hover:bg-yellow-500 disabled:bg-dark-subtext/30 disabled:text-dark-subtext
                         transition-all"
                disabled={loading || !hasChanges()}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Ripeness Guide Modal */}
          <RipenessGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
      </div>
    );
  }

  // Success Step (Before/After Confirmation)
  if (step === 'success' && before && after) {
    const changes: Array<{ field: string; before: string; after: string }> = [];

    if (before.batchId !== after.batchId) changes.push({ field: 'Batch ID', before: before.batchId, after: after.batchId });
    if (before.bananaId !== after.bananaId) changes.push({ field: 'Banana ID', before: before.bananaId, after: after.bananaId });
    if (before.stage !== after.stage) changes.push({ field: 'Stage', before: before.stage, after: after.stage });
    if (before.notes !== after.notes) changes.push({ field: 'Notes', before: before.notes, after: after.notes });

    return (
      <div
        className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div className="bg-ocean-surface rounded-xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="text-center mb-6">
            <CheckCircleIcon className="w-16 h-16 mb-4 mx-auto text-brand-green" />
            <h2 className="text-3xl font-bold text-brand-yellow mb-2">Metadata Updated Successfully</h2>
            <p className="text-dark-subtext">The following changes were applied:</p>
          </div>

          {/* Changes Summary */}
          <div className="bg-ocean-deep rounded-lg p-6 mb-6">
            <div className="space-y-4">
              {changes.map((change, index) => (
                <div key={index} className="border-b border-dark-subtext/20 pb-4 last:border-b-0 last:pb-0">
                  <div className="text-sm text-dark-subtext mb-2">{change.field}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-dark-subtext uppercase mb-1">Before</div>
                      <div className="text-red-400 line-through">{change.before}</div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-subtext uppercase mb-1">After</div>
                      <div className="text-brand-green font-semibold">{change.after}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-brand-yellow text-ocean-deep font-semibold rounded-lg
                     hover:bg-yellow-500 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}
