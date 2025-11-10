/**
 * Batch View
 * Display all batches with dual-view: All Photos or All Bananas
 * Supports 3-level navigation: Batch list → Batch detail (photos/bananas) → Banana timeline
 */

import React, { useEffect, useState } from 'react';
import { listBatches, getBatchImages, getBatchBananas, getBananaTimeline } from '../utils/apiClient';
import { BatchSummary, BananaSummary, ImageDocument, DeleteType } from '../types';
import { ImageGrid } from './ImageGrid';
import { ImageModal } from './ImageModal';
import { EditMetadataModal } from './EditMetadataModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { BoxIcon } from './icons/BoxIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

type ViewMode = 'photos' | 'bananas';

export function BatchView() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [sortedBatches, setSortedBatches] = useState<BatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchSummary | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('photos');

  // Photos view states
  const [batchImages, setBatchImages] = useState<ImageDocument[]>([]);

  // Bananas view states
  const [batchBananas, setBatchBananas] = useState<BananaSummary[]>([]);
  const [selectedBanana, setSelectedBanana] = useState<BananaSummary | null>(null);
  const [bananaImages, setBananaImages] = useState<ImageDocument[]>([]);

  // Sorting & Pagination states (for bananas view)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingBananas, setLoadingBananas] = useState(false);
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
      // Sort batches with natural sorting
      const sorted = [...data].sort((a, b) =>
        a.batchId.localeCompare(b.batchId, undefined, { numeric: true, sensitivity: 'base' })
      );
      setSortedBatches(sorted);
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
      setViewMode('photos');
      const images = await getBatchImages(batch.batchId);
      setBatchImages(images);
    } catch (err: any) {
      setError(err.message || 'Failed to load images');
    } finally {
      setLoadingImages(false);
    }
  };

  const loadBatchBananas = async () => {
    if (!selectedBatch) return;

    try {
      setLoadingBananas(true);
      const bananas = await getBatchBananas(selectedBatch.batchId);
      setBatchBananas(bananas);
      setCurrentPage(1); // Reset pagination when loading bananas
    } catch (err: any) {
      setError(err.message || 'Failed to load bananas');
    } finally {
      setLoadingBananas(false);
    }
  };

  const loadBananaTimeline = async (banana: BananaSummary) => {
    try {
      setLoadingImages(true);
      setSelectedBanana(banana);
      const images = await getBananaTimeline(banana.batchId, banana.bananaId);

      // Sort images by uploadedAt ascending (oldest first)
      const sortedImages = [...images].sort((a, b) => {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      });

      setBananaImages(sortedImages);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'bananas' && batchBananas.length === 0) {
      loadBatchBananas();
    }
  };

  const handleImageClick = (image: ImageDocument, index: number) => {
    setSelectedImage(image);
    setSelectedImageIndex(index);
  };

  const handleNextImage = () => {
    const images = selectedBanana ? bananaImages : batchImages;
    if (selectedImageIndex < images.length - 1) {
      const nextIndex = selectedImageIndex + 1;
      setSelectedImage(images[nextIndex]);
      setSelectedImageIndex(nextIndex);
    }
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex > 0) {
      const prevIndex = selectedImageIndex - 1;
      const images = selectedBanana ? bananaImages : batchImages;
      setSelectedImage(images[prevIndex]);
      setSelectedImageIndex(prevIndex);
    }
  };

  const handleDeleteSuccess = async () => {
    setDeleteTarget(null);
    setSelectedImage(null);
    setEditingImage(null);

    // Handle navigation based on what was deleted
    if (deleteTarget?.type === 'banana' && selectedBanana) {
      // Banana was deleted, go back to bananas view
      setSelectedBanana(null);
      setBananaImages([]);
      await loadBatchBananas();
    } else if (deleteTarget?.type === 'batch') {
      // Batch was deleted, go back to batch list
      setSelectedBatch(null);
      setBatchImages([]);
      setBatchBananas([]);
      setSelectedBanana(null);
    } else if (selectedBanana) {
      // Image in timeline was deleted, reload timeline
      await loadBananaTimeline(selectedBanana);
    } else if (selectedBatch && viewMode === 'photos') {
      // Image in photos view was deleted, reload photos
      await loadBatchImages(selectedBatch);
    }

    await loadBatches();
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

  // Sorting & Pagination Logic (for bananas view)
  const sortedBananas = React.useMemo(() => {
    const sorted = [...batchBananas].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.bananaId.localeCompare(b.bananaId, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        return b.bananaId.localeCompare(a.bananaId, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
    return sorted;
  }, [batchBananas, sortOrder]);

  const totalPages = Math.ceil(sortedBananas.length / itemsPerPage);

  const paginatedBananas = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBananas.slice(startIndex, endIndex);
  }, [sortedBananas, currentPage, itemsPerPage]);

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
          </div>
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

  // ============================================================================
  // LEVEL 3: Banana Timeline View
  // ============================================================================
  if (selectedBanana) {
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
                     hover:bg-red-500/30 transition-all font-semibold flex items-center space-x-2"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Delete All</span>
          </button>
        </div>

        {/* Timeline Info */}
        <div className="bg-ocean-surface rounded-xl p-6 border border-brand-yellow/20">
          <h2 className="text-xl font-bold text-brand-yellow mb-4">Ripeness Progression</h2>
          <div className="flex items-center space-x-2 overflow-x-auto">
            {selectedBanana.stages.map((stageInfo, index) => (
              <React.Fragment key={index}>
                <div className="bg-brand-green/20 text-brand-green px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
                  <div>{stageInfo.stage}</div>
                  <div className="text-xs text-brand-green/70 mt-1">
                    {new Date(stageInfo.firstCaptureTime).toLocaleDateString()}
                  </div>
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
              <SpinnerIcon className="w-16 h-16 mb-4 mx-auto animate-bounce text-brand-yellow" />
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

  // ============================================================================
  // LEVEL 2: Batch Detail View (Photos or Bananas)
  // ============================================================================
  if (selectedBatch) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setSelectedBatch(null);
                setBatchImages([]);
                setBatchBananas([]);
                setViewMode('photos');
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
                     hover:bg-red-500/30 transition-all font-semibold flex items-center space-x-2"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Delete Batch</span>
          </button>
        </div>

        {/* Toggle Switch for Photos/Bananas View */}
        <div className="flex items-center justify-center">
          <div className="inline-flex bg-ocean-surface rounded-lg p-1 border border-brand-yellow/20">
            <button
              onClick={() => handleViewModeChange('photos')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'photos'
                  ? 'bg-brand-yellow text-ocean-deep'
                  : 'text-dark-text hover:text-brand-yellow'
              }`}
            >
              All Photos
            </button>
            <button
              onClick={() => handleViewModeChange('bananas')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                viewMode === 'bananas'
                  ? 'bg-brand-yellow text-ocean-deep'
                  : 'text-dark-text hover:text-brand-yellow'
              }`}
            >
              All Bananas
            </button>
          </div>
        </div>

        {/* Photos View */}
        {viewMode === 'photos' && (
          <>
            {loadingImages ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
                  </div>
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
          </>
        )}

        {/* Bananas View */}
        {viewMode === 'bananas' && (
          <>
            {loadingBananas ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
                  </div>
                  <p className="text-dark-subtext">Loading bananas...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Sorting & Pagination Controls */}
                {batchBananas.length > 0 && (
                  <div className="bg-ocean-surface rounded-xl p-4 border border-brand-yellow/20">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Sort Controls */}
                      <div className="flex items-center gap-3">
                        <span className="text-dark-subtext text-sm">Sort by Banana ID:</span>
                        <button
                          onClick={handleSortToggle}
                          className="px-4 py-2 bg-ocean-deep border border-brand-yellow/30 text-dark-text
                                   rounded-lg hover:border-brand-yellow/50 transition-all font-semibold"
                        >
                          {sortOrder === 'asc' ? '🔤 A → Z' : '🔤 Z → A'}
                        </button>
                      </div>

                      {/* Items Per Page Selector */}
                      <div className="flex items-center gap-3">
                        <span className="text-dark-subtext text-sm">Items per page:</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          className="px-3 py-2 bg-ocean-deep border border-brand-yellow/30 text-dark-text
                                   rounded-lg hover:border-brand-yellow/50 transition-all focus:outline-none
                                   focus:border-brand-yellow"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      {/* Info Display */}
                      <div className="text-dark-subtext text-sm">
                        Showing {sortedBananas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(currentPage * itemsPerPage, sortedBananas.length)} of {sortedBananas.length} bananas
                      </div>
                    </div>
                  </div>
                )}

                {/* Banana Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedBananas.map((banana) => {
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
                          <BananaGuideIcon className="w-10 h-10 text-brand-yellow" />
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
                            {banana.stages.map((stageInfo, index) => (
                              <span
                                key={`${banana.bananaId}-${stageInfo.stage}-${index}`}
                                className="text-xs bg-brand-green/20 text-brand-green px-2 py-1 rounded"
                              >
                                {stageInfo.stage}
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
                                   hover:bg-red-500/30 transition-all text-sm font-semibold flex items-center justify-center space-x-2"
                        >
                          <TrashIcon className="w-5 h-5" />
                          <span>Delete Banana</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                               rounded-lg hover:border-brand-yellow/50 transition-all font-semibold
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-brand-yellow/30"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        const showEllipsis =
                          (page === 2 && currentPage > 3) ||
                          (page === totalPages - 1 && currentPage < totalPages - 2);

                        if (showEllipsis) {
                          return (
                            <span key={page} className="text-dark-subtext px-2">
                              ...
                            </span>
                          );
                        }

                        if (!showPage) {
                          return null;
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                              page === currentPage
                                ? 'bg-brand-yellow text-ocean-deep'
                                : 'bg-ocean-surface border border-brand-yellow/30 text-dark-text hover:border-brand-yellow/50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                               rounded-lg hover:border-brand-yellow/50 transition-all font-semibold
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-brand-yellow/30"
                    >
                      Next →
                    </button>
                  </div>
                )}

                {batchBananas.length === 0 && (
                  <div className="text-center py-20">
                    <BananaGuideIcon className="w-16 h-16 mb-4 mx-auto text-brand-yellow" />
                    <p className="text-dark-subtext text-lg">No bananas found in this batch</p>
                  </div>
                )}
              </>
            )}
          </>
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

  // ============================================================================
  // LEVEL 1: Batch List View
  // ============================================================================
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
                   rounded-lg hover:border-brand-yellow/50 transition-all flex items-center space-x-2"
        >
          <RefreshIcon className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Batch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedBatches.map((batch) => (
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
              <BoxIcon className="w-10 h-10 text-brand-yellow" />
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
                       hover:bg-red-500/30 transition-all text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete Batch</span>
            </button>
          </div>
        ))}
      </div>

      {sortedBatches.length === 0 && (
        <div className="text-center py-20">
          <div className="flex justify-center mb-4">
            <BoxIcon className="w-16 h-16 text-dark-subtext" />
          </div>
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
