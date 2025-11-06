/**
 * Image Modal
 * Full-size image viewer with metadata and actions
 */

import React, { useState, useEffect } from 'react';
import { ImageDocument } from '../types';
import { getSignedReadUrl } from '../utils/apiClient';

interface ImageModalProps {
  image: ImageDocument;
  onClose: () => void;
  onEdit?: (image: ImageDocument) => void;
  onDelete?: (image: ImageDocument) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function ImageModal({ image, onClose, onEdit, onDelete, onNext, onPrevious }: ImageModalProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImage();
  }, [image.objectPath]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(null);
      const { signedUrl } = await getSignedReadUrl(image.objectPath);
      setImageUrl(signedUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-7xl w-full max-h-full flex flex-col md:flex-row gap-4">
        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {loading && (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🍌</div>
              <p className="text-dark-subtext">Loading image...</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadImage}
                className="px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && imageUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt={`${image.bananaId} - ${image.stage}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />

              {/* Navigation Arrows */}
              {onPrevious && (
                <button
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-ocean-surface/90
                           border border-brand-yellow/30 rounded-full flex items-center justify-center
                           hover:bg-brand-yellow hover:text-ocean-deep transition-all text-2xl"
                >
                  ←
                </button>
              )}

              {onNext && (
                <button
                  onClick={onNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-ocean-surface/90
                           border border-brand-yellow/30 rounded-full flex items-center justify-center
                           hover:bg-brand-yellow hover:text-ocean-deep transition-all text-2xl"
                >
                  →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Metadata Sidebar */}
        <div className="w-full md:w-80 bg-ocean-surface rounded-xl p-6 overflow-y-auto custom-scrollbar">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-ocean-deep rounded-full
                     flex items-center justify-center hover:bg-red-500/20 transition-all text-xl"
          >
            ✕
          </button>

          {/* Metadata */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-brand-yellow mb-2">Image Details</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-dark-subtext uppercase tracking-wide">Batch ID</label>
                <p className="text-dark-text font-medium">{image.batchId}</p>
              </div>

              <div>
                <label className="text-xs text-dark-subtext uppercase tracking-wide">Banana ID</label>
                <p className="text-dark-text font-medium">{image.bananaId}</p>
              </div>

              <div>
                <label className="text-xs text-dark-subtext uppercase tracking-wide">Ripeness Stage</label>
                <p className="text-brand-green font-semibold text-lg">{image.stage}</p>
              </div>

              <div>
                <label className="text-xs text-dark-subtext uppercase tracking-wide">Capture Time</label>
                <p className="text-dark-text">{formatDate(image.captureTime)}</p>
              </div>

              {image.notes && (
                <div>
                  <label className="text-xs text-dark-subtext uppercase tracking-wide">Notes</label>
                  <p className="text-dark-text">{image.notes}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-dark-subtext uppercase tracking-wide">Uploaded</label>
                <p className="text-dark-text text-sm">{formatDate(image.uploadedAt)}</p>
              </div>

              {image.updatedAt && (
                <div>
                  <label className="text-xs text-dark-subtext uppercase tracking-wide">Last Updated</label>
                  <p className="text-dark-text text-sm">{formatDate(image.updatedAt)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-2 border-t border-brand-yellow/20">
              {onEdit && (
                <button
                  onClick={() => onEdit(image)}
                  className="w-full py-3 px-4 bg-brand-yellow text-ocean-deep font-semibold rounded-lg
                           hover:bg-yellow-500 transition-all flex items-center justify-center space-x-2"
                >
                  <span>✏️</span>
                  <span>Edit Metadata</span>
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(image)}
                  className="w-full py-3 px-4 bg-red-500/20 text-red-400 font-semibold rounded-lg
                           border border-red-500/30 hover:bg-red-500/30 transition-all
                           flex items-center justify-center space-x-2"
                >
                  <span>🗑️</span>
                  <span>Delete Image</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
