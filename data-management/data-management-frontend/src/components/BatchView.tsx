/**
 * Batch View
 * Display all batches and their images with management capabilities
 */

import React, { useEffect, useState } from 'react';
import { listBatches, getBatchImages } from '../utils/apiClient';
import { BatchSummary, ImageDocument, DeleteType } from '../types';
import { ImageGrid } from './ImageGrid';
import { ImageModal } from './ImageModal';
import { EditMetadataModal } from './EditMetadataModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export function BatchView() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchSummary | null>(null);
  const [batchImages, setBatchImages] = useState<ImageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedImage, setSelectedImage] = useState<ImageDocument | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [editingImage, setEditingImage] = useState<ImageDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: DeleteType; target: any } | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await listBatches();
      setBatches(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const loadBatchImages = async (batch: BatchSummary) => {
    try {
      setLoadingImages(true);
      setSelectedBatch(batch);
      const images = await getBatchImages(batch.batchId);
      setBatchImages(images);
    } catch (err: any) {
      setError(err.message || 'Failed to load images');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageClick = (image: ImageDocument, index: number) => {
    setSelectedImage(image);
    setSelectedImageIndex(index);
  };

  const handleNextImage = () => {
    if (selectedImageIndex < batchImages.length - 1) {
      const nextIndex = selectedImageIndex + 1;
      setSelectedImage(batchImages[nextIndex]);
      setSelectedImageIndex(nextIndex);
    }
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex > 0) {
      const prevIndex = selectedImageIndex - 1;
      setSelectedImage(batchImages[prevIndex]);
      setSelectedImageIndex(prevIndex);
    }
  };

  const handleDeleteSuccess = async () => {
    setDeleteTarget(null);
    setSelectedImage(null);
    setEditingImage(null);

    if (selectedBatch) {
      await loadBatchImages(selectedBatch);
    }
    await loadBatches();
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-dark-subtext">Loading batches...</p>
        </div>
      </div>
    );
  }

  if (error && batches.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadBatches}
          className="mt-4 px-4 py-2 bg-brand-yellow text-ocean-deep rounded-lg font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Batch list view
  if (!selectedBatch) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-brand-yellow mb-2">Batches</h1>
            <p className="text-dark-subtext">Browse and manage image collection batches</p>
          </div>
          <button
            onClick={loadBatches}
            className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                     rounded-lg hover:border-brand-yellow/50 transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Batch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <div
              key={batch.batchId}
              className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20
                       hover:border-brand-yellow/50 hover:scale-105 transition-all cursor-pointer"
              onClick={() => loadBatchImages(batch)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-brand-yellow mb-1">{batch.batchId}</h3>
                  <p className="text-dark-subtext text-sm">
                    {formatDate(batch.firstCaptureTime)} - {formatDate(batch.lastCaptureTime)}
                  </p>
                </div>
                <div className="text-4xl">📦</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-ocean-deep rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-brand-green">{batch.imageCount}</div>
                  <div className="text-xs text-dark-subtext">Images</div>
                </div>
                <div className="bg-ocean-deep rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-brand-yellow">{batch.bananaCount}</div>
                  <div className="text-xs text-dark-subtext">Bananas</div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({
                    type: 'batch',
                    target: { batchId: batch.batchId, imageCount: batch.imageCount },
                  });
                }}
                className="mt-4 w-full py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30
                         hover:bg-red-500/30 transition-all text-sm font-semibold"
              >
                🗑️ Delete Batch
              </button>
            </div>
          ))}
        </div>

        {batches.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-dark-subtext text-lg">No batches found</p>
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

  // Batch detail view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setSelectedBatch(null);
              setBatchImages([]);
            }}
            className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                     rounded-lg hover:border-brand-yellow/50 transition-all"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-4xl font-bold text-brand-yellow mb-1">{selectedBatch.batchId}</h1>
            <p className="text-dark-subtext">
              {selectedBatch.imageCount} images • {selectedBatch.bananaCount} bananas
            </p>
          </div>
        </div>
        <button
          onClick={() => setDeleteTarget({
            type: 'batch',
            target: { batchId: selectedBatch.batchId, imageCount: selectedBatch.imageCount },
          })}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30
                   hover:bg-red-500/30 transition-all font-semibold"
        >
          🗑️ Delete Batch
        </button>
      </div>

      {/* Images Grid */}
      {loadingImages ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🍌</div>
            <p className="text-dark-subtext">Loading images...</p>
          </div>
        </div>
      ) : (
        <ImageGrid
          images={batchImages}
          onImageClick={handleImageClick}
          emptyMessage="No images in this batch"
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onEdit={setEditingImage}
          onDelete={(img) => setDeleteTarget({ type: 'image', target: { documentId: img._id } })}
          onNext={selectedImageIndex < batchImages.length - 1 ? handleNextImage : undefined}
          onPrevious={selectedImageIndex > 0 ? handlePreviousImage : undefined}
        />
      )}

      {/* Edit Modal */}
      {editingImage && (
        <EditMetadataModal
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSuccess={(updated) => {
            setBatchImages((prev) => prev.map((img) => (img._id === updated._id ? updated : img)));
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
