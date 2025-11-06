/**
 * Image Grid
 * Displays images in a responsive grid with thumbnails
 */

import React, { useState, useEffect } from 'react';
import { ImageDocument } from '../types';
import { getSignedReadUrl } from '../utils/apiClient';

interface ImageGridProps {
  images: ImageDocument[];
  onImageClick: (image: ImageDocument, index: number) => void;
  emptyMessage?: string;
}

function ImageThumbnail({
  image,
  onClick,
}: {
  image: ImageDocument;
  onClick: () => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadThumbnail();
  }, [image.objectPath]);

  const loadThumbnail = async () => {
    try {
      setLoading(true);
      setError(false);
      const { signedUrl } = await getSignedReadUrl(image.objectPath);
      setThumbnailUrl(signedUrl);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-ocean-surface rounded-lg overflow-hidden border border-brand-yellow/20
               hover:border-brand-yellow/50 hover:scale-105 transition-all duration-200 cursor-pointer
               aspect-square animate-fade-in"
    >
      {/* Image */}
      <div className="w-full h-full flex items-center justify-center bg-ocean-deep">
        {loading && (
          <div className="text-4xl animate-bounce">🍌</div>
        )}

        {error && !loading && (
          <div className="text-center p-4">
            <div className="text-3xl mb-2">❌</div>
            <p className="text-xs text-dark-subtext">Failed to load</p>
          </div>
        )}

        {!loading && !error && thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={`${image.bananaId} - ${image.stage}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Overlay on Hover */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity
                    flex flex-col items-center justify-center p-3 text-center">
        <div className="text-brand-yellow font-semibold mb-1 text-sm">{image.bananaId}</div>
        <div className="text-brand-green font-medium text-xs mb-2">{image.stage}</div>
        <div className="text-dark-subtext text-xs">{formatDate(image.captureTime)}</div>
      </div>

      {/* Stage Badge */}
      <div className="absolute top-2 right-2 bg-brand-green/90 text-ocean-deep text-xs font-semibold
                    px-2 py-1 rounded">
        {image.stage}
      </div>
    </div>
  );
}

export function ImageGrid({ images, onImageClick, emptyMessage = 'No images found' }: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🍌</div>
        <p className="text-dark-subtext text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {images.map((image, index) => (
        <ImageThumbnail
          key={image._id}
          image={image}
          onClick={() => onImageClick(image, index)}
        />
      ))}
    </div>
  );
}
