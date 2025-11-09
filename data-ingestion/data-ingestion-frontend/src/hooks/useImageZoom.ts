import { useState, useRef, useCallback, TouchEvent, MouseEvent } from 'react';

interface UseImageZoomResult {
  scale: number;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: () => void;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

export const useImageZoom = (): UseImageZoomResult => {
  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Constrain position to prevent panning outside image bounds
  const constrainPosition = useCallback((x: number, y: number, currentScale: number): { x: number; y: number } => {
    if (!containerRef.current) return { x, y };

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageWidth = containerRect.width * currentScale;
    const imageHeight = containerRect.height * currentScale;

    // Maximum allowed pan distance (half of the zoomed image size minus container size)
    const maxX = Math.max(0, (imageWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (imageHeight - containerRect.height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  // Touch event handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      lastTouchDistance.current = getTouchDistance(e.touches);
    } else if (e.touches.length === 1 && scale > MIN_SCALE) {
      // Single touch for panning when zoomed
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const distanceChange = currentDistance - lastTouchDistance.current;
      const scaleChange = distanceChange * 0.01;

      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + scaleChange));
      setScale(newScale);
      lastTouchDistance.current = currentDistance;

      // Reset position if zooming out to minimum
      if (newScale === MIN_SCALE) {
        setPosition({ x: 0, y: 0 });
      } else {
        // Constrain position when zooming
        setPosition(prev => constrainPosition(prev.x, prev.y, newScale));
      }
    } else if (e.touches.length === 1 && isDragging && scale > MIN_SCALE) {
      // Pan
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition(constrainPosition(newX, newY, scale));
    }
  }, [scale, isDragging, dragStart, constrainPosition]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  }, []);

  // Mouse event handlers for desktop
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (scale > MIN_SCALE) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && scale > MIN_SCALE) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition(constrainPosition(newX, newY, scale));
    }
  }, [isDragging, scale, dragStart, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Button zoom controls
  const zoomIn = useCallback(() => {
    const newScale = Math.min(MAX_SCALE, scale + ZOOM_STEP);
    setScale(newScale);
    if (newScale === MIN_SCALE) {
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition(prev => constrainPosition(prev.x, prev.y, newScale));
    }
  }, [scale, constrainPosition]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(MIN_SCALE, scale - ZOOM_STEP);
    setScale(newScale);
    if (newScale === MIN_SCALE) {
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition(prev => constrainPosition(prev.x, prev.y, newScale));
    }
  }, [scale, constrainPosition]);

  const resetZoom = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  return {
    scale,
    position,
    containerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    resetZoom,
  };
};
