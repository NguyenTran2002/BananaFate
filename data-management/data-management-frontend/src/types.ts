// Ripeness stages (from data-ingestion)
export enum RipenessStage {
  UNDER_RIPE = 'Under Ripe',
  BARELY_RIPE = 'Barely Ripe',
  RIPE = 'Ripe',
  VERY_RIPE = 'Very Ripe',
  OVER_RIPE = 'Over Ripe',
  DEATH = 'Death',
}

// Image document from MongoDB
export interface ImageDocument {
  _id: string;
  batchId: string;
  bananaId: string;
  captureTime: string;
  stage: string;
  notes: string;
  objectPath: string;
  gcsUrl: string;
  uploadedAt: string;
  updatedAt?: string;
  fileSizeBytes?: number;  // File size in bytes (optional for backward compatibility)
}

// Image quality metadata extracted from GCS blob
export interface ImageQuality {
  width: number;
  height: number;
  resolution: string;
  format: string;
  file_size_bytes: number;
  file_size_kb: number;
  file_size_mb: number | null;
  file_size_formatted: string;
  aspect_ratio_decimal: number;
  aspect_ratio_label: string;
  orientation: 'portrait' | 'landscape' | 'square';
  compression_quality: number | null;
  color_mode: string;
}

// Batch summary
export interface BatchSummary {
  batchId: string;
  imageCount: number;
  bananaCount: number;
  firstCaptureTime: string;
  lastCaptureTime: string;
}

// Banana summary
export interface BananaSummary {
  batchId: string;
  bananaId: string;
  imageCount: number;
  firstCaptureTime: string;
  lastCaptureTime: string;
  stages: string[];
}

// Analytics data
export interface AnalyticsCounts {
  totalImages: number;
  totalBatches: number;
  totalBananas: number;
  byStage: Record<string, number>;
  byBatch: Record<string, number>;
}

export interface TimelineDataPoint {
  date: string;
  count: number;
  stages: Record<string, number>;
}

export interface StageDistribution {
  stage: string;
  count: number;
  percentage: number;
}

// Storage analytics data
export interface StorageImageInfo {
  documentId: string;
  batchId: string;
  bananaId: string;
  objectPath: string;
  stage: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
}

export interface StorageAnalytics {
  totalStorageBytes: number;
  totalStorageFormatted: string;
  totalPhotos: number;
  averagePerPhotoBytes: number;
  averagePerPhotoFormatted: string;
  averagePerBananaBytes: number;
  averagePerBananaFormatted: string;
  totalBananas: number;
  estimatedMonthlyCostUSD: number;
  largestImages: StorageImageInfo[];
  smallestImages: StorageImageInfo[];
  imagesWithoutSize: number;
}

// Update metadata request
export interface UpdateMetadataRequest {
  batchId?: string;
  bananaId?: string;
  captureTime?: string;
  stage?: string;
  notes?: string;
}

// Delete confirmation types
export type DeleteType = 'image' | 'banana' | 'batch';

export interface DeleteConfirmationData {
  type: DeleteType;
  target: {
    documentId?: string;
    batchId?: string;
    bananaId?: string;
    imageCount?: number;
  };
  message: string;
}

// Navigation routes
export enum NavigationRoute {
  DASHBOARD = 'dashboard',
  BATCHES = 'batches',
  BANANAS = 'bananas',
  ANALYTICS = 'analytics',
}
