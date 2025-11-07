/**
 * Delete Confirmation Modal
 * Handles deletion confirmation for image/banana/batch with impact preview
 */

import React, { useState } from 'react';
import { DeleteType } from '../types';
import { deleteImage, deleteBanana, deleteBatch } from '../utils/apiClient';

interface DeleteConfirmationModalProps {
  type: DeleteType;
  target: {
    documentId?: string;
    batchId?: string;
    bananaId?: string;
    imageCount?: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteConfirmationModal({ type, target, onClose, onSuccess }: DeleteConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [success, setSuccess] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  const getDeleteInfo = () => {
    switch (type) {
      case 'image':
        return {
          title: 'Delete Image',
          icon: '🗑️',
          message: 'Are you sure you want to delete this image?',
          confirmPhrase: 'DELETE IMAGE',
          warningLevel: 'medium',
          impact: 'This action will permanently delete the image from both MongoDB and Google Cloud Storage.',
        };
      case 'banana':
        return {
          title: 'Delete All Banana Images',
          icon: '🍌🗑️',
          message: `Delete all ${target.imageCount || '?'} images of banana ${target.bananaId}?`,
          confirmPhrase: 'DELETE BANANA',
          warningLevel: 'high',
          impact: `This will permanently delete ${target.imageCount || 'all'} images of this banana from both MongoDB and Google Cloud Storage. This action cannot be undone.`,
        };
      case 'batch':
        return {
          title: 'Delete Entire Batch',
          icon: '📦🗑️',
          message: `Delete the entire batch "${target.batchId}"?`,
          confirmPhrase: 'DELETE BATCH',
          warningLevel: 'critical',
          impact: `This will permanently delete ALL images in this batch from both MongoDB and Google Cloud Storage. This is a destructive operation that cannot be undone.`,
        };
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      switch (type) {
        case 'image':
          if (!target.documentId) throw new Error('Document ID required');
          result = await deleteImage(target.documentId);
          setDeletedCount(result.deletedCount || 1);
          break;

        case 'banana':
          if (!target.batchId || !target.bananaId) throw new Error('Batch ID and Banana ID required');
          result = await deleteBanana(target.batchId, target.bananaId);
          setDeletedCount(result.deletedCount);

          // Check for partial success
          if (result.expectedCount && result.deletedCount !== result.expectedCount) {
            throw new Error(
              `Partial deletion: ${result.deletedCount}/${result.expectedCount} records deleted. ` +
              `Some GCS files may have failed to delete.`
            );
          }
          break;

        case 'batch':
          if (!target.batchId) throw new Error('Batch ID required');
          result = await deleteBatch(target.batchId);
          setDeletedCount(result.deletedCount);

          // Check for partial success
          if (result.expectedCount && result.deletedCount !== result.expectedCount) {
            throw new Error(
              `Partial deletion: ${result.deletedCount}/${result.expectedCount} records deleted. ` +
              `Some GCS files may have failed to delete.`
            );
          }
          break;
      }

      // Check for errors in response
      if (result.errors && result.errors.length > 0) {
        throw new Error(`Deletion completed with errors: ${result.errors.join('; ')}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      // Better error handling
      let errorMessage = 'Failed to delete';

      if (err.message) {
        errorMessage = err.message;
      } else if (err.detail) {
        if (typeof err.detail === 'object' && err.detail.message) {
          errorMessage = err.detail.message;
          if (err.detail.errors && err.detail.errors.length > 0) {
            errorMessage += '. Errors: ' + err.detail.errors.slice(0, 3).join('; ');
            if (err.detail.errors.length > 3) {
              errorMessage += ` (and ${err.detail.errors.length - 3} more)`;
            }
          }
        } else if (typeof err.detail === 'string') {
          errorMessage = err.detail;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const info = getDeleteInfo();
  const isConfirmed = confirmText === info.confirmPhrase;

  const getBorderColor = () => {
    switch (info.warningLevel) {
      case 'medium':
        return 'border-orange-500/30';
      case 'high':
        return 'border-red-500/30';
      case 'critical':
        return 'border-red-600/50';
    }
  };

  const getBgColor = () => {
    switch (info.warningLevel) {
      case 'medium':
        return 'bg-orange-500/10';
      case 'high':
        return 'bg-red-500/10';
      case 'critical':
        return 'bg-red-600/20';
    }
  };

  // Success view
  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSuccess();
            onClose();
          }
        }}
      >
        <div className="bg-ocean-surface rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-brand-yellow mb-4">Deleted Successfully</h2>
          <p className="text-dark-subtext mb-2">
            {deletedCount} {deletedCount === 1 ? 'image' : 'images'} deleted
          </p>
          <p className="text-xs text-dark-subtext">Closing automatically...</p>
        </div>
      </div>
    );
  }

  // Confirmation view
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-ocean-surface rounded-xl p-8 max-w-lg w-full border-2 ${getBorderColor()}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{info.icon}</div>
          <h2 className="text-3xl font-bold text-red-400 mb-2">{info.title}</h2>
          <p className="text-dark-text text-lg">{info.message}</p>
        </div>

        {/* Warning Box */}
        <div className={`${getBgColor()} border ${getBorderColor()} rounded-lg p-4 mb-6`}>
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="text-red-400 font-semibold mb-2">Warning: This action is irreversible</p>
              <p className="text-dark-subtext text-sm">{info.impact}</p>
            </div>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark-text mb-2">
            Type <span className="text-red-400 font-mono">{info.confirmPhrase}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 bg-ocean-deep border border-dark-subtext/30 rounded-lg
                     text-dark-text font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder={info.confirmPhrase}
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-ocean-deep border border-dark-subtext/30 text-dark-text
                     rounded-lg hover:bg-ocean-deep/70 transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="flex-1 py-3 px-4 bg-red-500 text-white font-semibold rounded-lg
                     hover:bg-red-600 disabled:bg-dark-subtext/30 disabled:text-dark-subtext
                     disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
