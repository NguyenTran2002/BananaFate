/**
 * Banana View
 * Display all bananas with their timeline progression
 */

import React, { useEffect, useState } from 'react';
import { listBananas, getBananaTimeline } from '../utils/apiClient';
import { BananaSummary, ImageDocument, DeleteType } from '../types';
import { ImageGrid } from './ImageGrid';
import { ImageModal } from './ImageModal';
import { EditMetadataModal } from './EditMetadataModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export function BananaView() {
  const [bananas, setBananas] = useState<BananaSummary[]>([]);
  const [selectedBanana, setSelectedBanana] = useState<BananaSummary | null>(null);
  const [bananaImages, setBananaImages] = useState<ImageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedImage, setSelectedImage] = useState<ImageDocument | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [editingImage, setEditingImage] = useState<ImageDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: DeleteType; target: any } | null>(null);

  useEffect(() => {
    loadBananas();
  }, []);

  const loadBananas = async () => {
    try {
      setLoading(true);
      const data = await listBananas();
      setBananas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load bananas');
    } finally {
      setLoading(false);
    }
  };

  const loadBananaTimeline = async (banana: BananaSummary) => {
    try {
      setLoadingImages(true);
      setSelectedBanana(banana);
      const images = await getBananaTimeline(banana.batchId, banana.bananaId);
      setBananaImages(images);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageClick = (image: ImageDocument, index: number) => {
    setSelectedImage(image);
    setSelectedImageIndex(index);
  };

  const handleNextImage = () => {
    if (selectedImageIndex < bananaImages.length - 1) {
      const nextIndex = selectedImageIndex + 1;
      setSelectedImage(bananaImages[nextIndex]);
      setSelectedImageIndex(nextIndex);
    }
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex > 0) {
      const prevIndex = selectedImageIndex - 1;
      setSelectedImage(bananaImages[prevIndex]);
      setSelectedImageIndex(prevIndex);
    }
  };

  const handleDeleteSuccess = async () => {
    setDeleteTarget(null);
    setSelectedImage(null);
    setEditingImage(null);

    if (selectedBanana) {
      // If we deleted the whole banana, go back to list
      if (deleteTarget?.type === 'banana') {
        setSelectedBanana(null);
        setBananaImages([]);
      } else {
        // Otherwise reload the timeline
        await loadBananaTimeline(selectedBanana);
      }
    }
    await loadBananas();
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const getDaysSpan = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍌</div>
          <p className="text-dark-subtext">Loading bananas...</p>
        </div>
      </div>
    );
  }

  if (error && bananas.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadBananas}
          className="mt-4 px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Banana list view
  if (!selectedBanana) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-brand-yellow mb-2">Bananas</h1>
            <p className="text-dark-subtext">Explore banana ripeness progression timelines</p>
          </div>
          <button
            onClick={loadBananas}
            className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                     rounded-lg hover:border-brand-yellow/50 transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Banana Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bananas.map((banana) => {
            const daysSpan = getDaysSpan(banana.firstCaptureTime, banana.lastCaptureTime);

            return (
              <div
                key={`${banana.batchId}-${banana.bananaId}`}
                className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20
                         hover:border-brand-yellow/50 hover:scale-105 transition-all cursor-pointer"
                onClick={() => loadBananaTimeline(banana)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-brand-yellow mb-1">{banana.bananaId}</h3>
                    <p className="text-dark-subtext text-sm">{banana.batchId}</p>
                  </div>
                  <div className="text-4xl">🍌</div>
                </div>

                {/* Timeline Info */}
                <div className="bg-ocean-deep rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-subtext text-xs">Timeline</span>
                    <span className="text-brand-green font-semibold text-sm">{daysSpan} days</span>
                  </div>
                  <div className="text-dark-subtext text-xs">
                    {formatDate(banana.firstCaptureTime)} → {formatDate(banana.lastCaptureTime)}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-ocean-deep rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-brand-green">{banana.imageCount}</div>
                    <div className="text-xs text-dark-subtext">Images</div>
                  </div>
                  <div className="bg-ocean-deep rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-brand-yellow">{banana.stages.length}</div>
                    <div className="text-xs text-dark-subtext">Stages</div>
                  </div>
                </div>

                {/* Stages */}
                <div className="mb-4">
                  <div className="text-xs text-dark-subtext uppercase mb-2">Ripeness Stages</div>
                  <div className="flex flex-wrap gap-1">
                    {banana.stages.map((stage) => (
                      <span
                        key={stage}
                        className="text-xs bg-brand-green/20 text-brand-green px-2 py-1 rounded"
                      >
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({
                      type: 'banana',
                      target: {
                        batchId: banana.batchId,
                        bananaId: banana.bananaId,
                        imageCount: banana.imageCount,
                      },
                    });
                  }}
                  className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30
                           hover:bg-red-500/30 transition-all text-sm font-semibold"
                >
                  🗑️ Delete Banana
                </button>
              </div>
            );
          })}
        </div>

        {bananas.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍌</div>
            <p className="text-dark-subtext text-lg">No bananas found</p>
          </div>
        )}

        {/* Delete Modal */}
        {deleteTarget && (
          <DeleteConfirmationModal
            type={deleteTarget.type}
            target={deleteTarget.target}
            onClose={() => setDeleteTarget(null)}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </div>
    );
  }

  // Banana timeline view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setSelectedBanana(null);
              setBananaImages([]);
            }}
            className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                     rounded-lg hover:border-brand-yellow/50 transition-all"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-4xl font-bold text-brand-yellow mb-1">{selectedBanana.bananaId}</h1>
            <p className="text-dark-subtext">
              {selectedBanana.batchId} • {selectedBanana.imageCount} images •{' '}
              {getDaysSpan(selectedBanana.firstCaptureTime, selectedBanana.lastCaptureTime)} days
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            setDeleteTarget({
              type: 'banana',
              target: {
                batchId: selectedBanana.batchId,
                bananaId: selectedBanana.bananaId,
                imageCount: selectedBanana.imageCount,
              },
            })
          }
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30
                   hover:bg-red-500/30 transition-all font-semibold"
        >
          🗑️ Delete All
        </button>
      </div>

      {/* Timeline Info */}
      <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
        <h2 className="text-xl font-bold text-brand-yellow mb-4">Ripeness Progression</h2>
        <div className="flex items-center space-x-2 overflow-x-auto">
          {selectedBanana.stages.map((stage, index) => (
            <React.Fragment key={index}>
              <div className="bg-brand-green/20 text-brand-green px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
                {stage}
              </div>
              {index < selectedBanana.stages.length - 1 && (
                <div className="text-brand-yellow text-2xl">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Images Grid (Timeline Order) */}
      {loadingImages ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🍌</div>
            <p className="text-dark-subtext">Loading timeline...</p>
          </div>
        </div>
      ) : (
        <ImageGrid
          images={bananaImages}
          onImageClick={handleImageClick}
          emptyMessage="No images for this banana"
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onEdit={setEditingImage}
          onDelete={(img) => setDeleteTarget({ type: 'image', target: { documentId: img._id } })}
          onNext={selectedImageIndex < bananaImages.length - 1 ? handleNextImage : undefined}
          onPrevious={selectedImageIndex > 0 ? handlePreviousImage : undefined}
        />
      )}

      {/* Edit Modal */}
      {editingImage && (
        <EditMetadataModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSuccess={(updated) => {
            setBananaImages((prev) => prev.map((img) => (img._id === updated._id ? updated : img)));
            setEditingImage(null);
            if (selectedImage && selectedImage._id === updated._id) {
              setSelectedImage(updated);
            }
          }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          type={deleteTarget.type}
          target={deleteTarget.target}
          onClose={() => setDeleteTarget(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
