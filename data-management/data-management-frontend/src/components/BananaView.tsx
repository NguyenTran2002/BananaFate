/**
 * Banana View
 * Display all bananas with their timeline progression
 */

import React, { useEffect, useState, useRef } from 'react';
import { listBananas, getBananaTimeline } from '../utils/apiClient';
import { BananaSummary, ImageDocument, DeleteType } from '../types';
import { ImageGrid } from './ImageGrid';
import { ImageModal } from './ImageModal';
import { EditMetadataModal } from './EditMetadataModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BananaGuideIcon } from './icons/BananaGuideIcon';

export function BananaView() {
  const [bananas, setBananas] = useState<BananaSummary[]>([]);
  const [selectedBanana, setSelectedBanana] = useState<BananaSummary | null>(null);
  const [bananaImages, setBananaImages] = useState<ImageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting & Pagination states
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Modal states
  const [selectedImage, setSelectedImage] = useState<ImageDocument | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [editingImage, setEditingImage] = useState<ImageDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: DeleteType; target: any } | null>(null);

  // Scroll position restoration
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBananas();
  }, []);

  // Restore scroll position when returning to banana list
  useEffect(() => {
    if (!selectedBanana && scrollPosition > 0 && containerRef.current) {
      // Find the scrollable parent (the main element in App.tsx)
      const scrollableParent = containerRef.current.closest('.overflow-y-auto');
      if (scrollableParent) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          scrollableParent.scrollTop = scrollPosition;
        }, 0);
      }
    }
  }, [selectedBanana, scrollPosition]);

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
      // Save scroll position before navigating
      if (containerRef.current) {
        const scrollableParent = containerRef.current.closest('.overflow-y-auto');
        if (scrollableParent) {
          setScrollPosition(scrollableParent.scrollTop);
        }
      }

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

  // Sorting & Pagination Logic
  const sortedBananas = React.useMemo(() => {
    const sorted = [...bananas].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.bananaId.localeCompare(b.bananaId, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        return b.bananaId.localeCompare(a.bananaId, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
    return sorted;
  }, [bananas, sortOrder]);

  const totalPages = Math.ceil(sortedBananas.length / itemsPerPage);

  const paginatedBananas = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBananas.slice(startIndex, endIndex);
  }, [sortedBananas, currentPage, itemsPerPage]);

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
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
          <SpinnerIcon className="w-16 h-16 mb-4 mx-auto animate-bounce text-brand-yellow" />
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
      <div ref={containerRef} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-brand-yellow mb-2">Bananas</h1>
            <p className="text-dark-subtext">Explore banana ripeness progression timelines</p>
          </div>
          <button
            onClick={loadBananas}
            className="px-4 py-2 bg-ocean-surface border border-brand-yellow/30 text-dark-text
                     rounded-lg hover:border-brand-yellow/50 transition-all flex items-center space-x-2"
          >
            <RefreshIcon className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Sorting & Pagination Controls */}
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

        {bananas.length === 0 && (
          <div className="text-center py-20">
            <BananaGuideIcon className="w-16 h-16 mb-4 mx-auto text-brand-yellow" />
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
