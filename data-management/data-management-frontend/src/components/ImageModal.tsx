/**
 * Image Modal
 * Full-size image viewer with metadata and actions
 */

import React, { useState, useEffect } from 'react';
import { ImageDocument, ImageQuality } from '../types';
import { getSignedReadUrl, getImageQuality } from '../utils/apiClient';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';

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

  // Image quality state
  const [qualityData, setQualityData] = useState<ImageQuality | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  useEffect(() => {
    loadImage();
    loadQualityData();
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

  const loadQualityData = async () => {
    try {
      setQualityLoading(true);
      setQualityError(null);
      const quality = await getImageQuality(image.objectPath);
      setQualityData(quality);
    } catch (err: any) {
      setQualityError(err.message || 'Failed to load image quality');
      console.error('[ImageModal] Failed to load quality data:', err);
    } finally {
      setQualityLoading(false);
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
      className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-2 !m-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-7xl w-full max-h-[96vh] flex flex-col md:flex-row gap-4">
        {/* Image Display */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {loading && (
            <div className="text-center">
              <SpinnerIcon className="w-16 h-16 mb-4 mx-auto animate-bounce text-brand-yellow" />
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
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
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
        <div className="w-full md:w-80 md:self-center bg-ocean-surface rounded-xl p-4 md:max-h-[96vh] overflow-y-auto custom-scrollbar">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-ocean-deep rounded-full
                     flex items-center justify-center hover:bg-red-500/20 transition-all text-xl"
          >
            ✕
          </button>

          {/* Metadata */}
          <div className="space-y-3">
            {/* Two-column grid for Details and Quality */}
            <div className="grid grid-cols-2 gap-3">
              {/* Image Details Column */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-brand-yellow mb-1">Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="text-xs text-dark-subtext uppercase tracking-wide block">Batch ID</label>
                    <p className="text-dark-text font-medium">{image.batchId}</p>
                  </div>

                  <div>
                    <label className="text-xs text-dark-subtext uppercase tracking-wide block">Banana ID</label>
                    <p className="text-dark-text font-medium">{image.bananaId}</p>
                  </div>

                  <div>
                    <label className="text-xs text-dark-subtext uppercase tracking-wide block">Stage</label>
                    <p className="text-brand-green font-semibold">{image.stage}</p>
                  </div>

                  <div>
                    <label className="text-xs text-dark-subtext uppercase tracking-wide block">Captured</label>
                    <p className="text-dark-text text-xs">{formatDate(image.captureTime)}</p>
                  </div>

                  {image.notes && (
                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Notes</label>
                      <p className="text-dark-text text-xs">{image.notes}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-dark-subtext uppercase tracking-wide block">Uploaded</label>
                    <p className="text-dark-text text-xs">{formatDate(image.uploadedAt)}</p>
                  </div>

                  {image.updatedAt && (
                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Updated</label>
                      <p className="text-dark-text text-xs">{formatDate(image.updatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Quality Column */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-brand-yellow mb-1">Quality</h3>

                {qualityLoading && (
                  <div className="text-center py-2">
                    <p className="text-dark-subtext text-xs">Loading...</p>
                  </div>
                )}

                {qualityError && (
                  <div className="text-center py-1">
                    <p className="text-red-400 text-xs">{qualityError}</p>
                  </div>
                )}

                {qualityData && !qualityLoading && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Resolution</label>
                      <p className="text-dark-text font-medium text-xs">{qualityData.resolution}</p>
                    </div>

                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Format</label>
                      <p className="text-dark-text font-medium text-xs">{qualityData.format}</p>
                    </div>

                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">File Size</label>
                      <p className="text-dark-text font-medium text-xs">{qualityData.file_size_formatted}</p>
                    </div>

                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Aspect Ratio</label>
                      <p className="text-dark-text font-medium text-xs">{qualityData.aspect_ratio_label}</p>
                    </div>

                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Orientation</label>
                      <p className="text-dark-text font-medium text-xs capitalize">{qualityData.orientation}</p>
                    </div>

                    {qualityData.compression_quality && (
                      <div>
                        <label className="text-xs text-dark-subtext uppercase tracking-wide block">Quality</label>
                        <p className="text-dark-text font-medium text-xs">{qualityData.compression_quality}%</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-dark-subtext uppercase tracking-wide block">Color Mode</label>
                      <p className="text-dark-text font-medium text-xs">{qualityData.color_mode}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-brand-yellow/20">
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(image)}
                    className="flex-1 py-2.5 px-3 bg-brand-yellow text-ocean-deep font-semibold rounded-lg
                             hover:bg-yellow-500 transition-all flex items-center justify-center space-x-1.5 text-sm"
                  >
                    <EditIcon className="w-5 h-5" />
                    <span>Edit</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => onDelete(image)}
                    className="flex-1 py-2.5 px-3 bg-red-500/20 text-red-400 font-semibold rounded-lg
                             border border-red-500/30 hover:bg-red-500/30 transition-all
                             flex items-center justify-center space-x-1.5 text-sm"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
