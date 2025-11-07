/**
 * API client for BananaFate Data Management
 * Handles all backend API calls with authentication
 */

import {
  ImageDocument,
  ImageQuality,
  BatchSummary,
  BananaSummary,
  AnalyticsCounts,
  TimelineDataPoint,
  StageDistribution,
  StorageAnalytics,
  UpdateMetadataRequest,
} from '../types';

// Get backend URL from environment or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// API timeout (30 seconds)
const API_TIMEOUT = 30000;

// Logout callback for automatic logout on auth failures
let logoutCallback: (() => void) | null = null;

/**
 * Register a callback to be called when authentication fails
 */
export function setLogoutCallback(callback: () => void): void {
  logoutCallback = callback;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an authenticated API request
 */
async function makeAuthenticatedRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('authToken');

  if (!token) {
    // Automatically logout if no token found
    if (logoutCallback) {
      console.error('[API] No authentication token found, logging out automatically');
      logoutCallback();
    }
    throw new ApiError('No authentication token found', 401);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(
        errorText || `HTTP ${response.status}`,
        response.status,
        errorText
      );
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error.message || 'Network error');
  }
}

// ============================================================================
// Authentication
// ============================================================================

export async function login(password: string): Promise<{ token: string; expiresIn: number }> {
  console.log('[AUTH] Attempting login');

  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AUTH] Login failed:', errorText);
    throw new ApiError(errorText || 'Login failed', response.status);
  }

  const result = await response.json();
  console.log('[AUTH] Login successful, token expires in:', result.expiresIn, 'seconds');
  return result;
}

// ============================================================================
// Batch Operations
// ============================================================================

export async function listBatches(): Promise<BatchSummary[]> {
  console.log('[API] Fetching batch list');
  const result = await makeAuthenticatedRequest<BatchSummary[]>('/batches');
  console.log('[API] Retrieved', result.length, 'batches');
  return result;
}

export async function getBatchImages(batchId: string): Promise<ImageDocument[]> {
  console.log('[API] Fetching images for batch:', batchId);
  const result = await makeAuthenticatedRequest<ImageDocument[]>(`/batches/${batchId}`);
  console.log('[API] Retrieved', result.length, 'images');
  return result;
}

export async function deleteBatch(batchId: string): Promise<{ success: boolean; deletedCount: number }> {
  console.log('[API] Deleting batch:', batchId);
  const result = await makeAuthenticatedRequest<{ success: boolean; deletedCount: number }>(
    `/batch/${batchId}`,
    { method: 'DELETE' }
  );
  console.log('[API] Batch deleted:', result);
  return result;
}

// ============================================================================
// Banana Operations
// ============================================================================

export async function listBananas(): Promise<BananaSummary[]> {
  console.log('[API] Fetching banana list');
  const result = await makeAuthenticatedRequest<BananaSummary[]>('/bananas');
  console.log('[API] Retrieved', result.length, 'bananas');
  return result;
}

export async function getBananaTimeline(batchId: string, bananaId: string): Promise<ImageDocument[]> {
  console.log('[API] Fetching timeline for banana:', batchId, bananaId);
  const result = await makeAuthenticatedRequest<ImageDocument[]>(`/bananas/${batchId}/${bananaId}`);
  console.log('[API] Retrieved', result.length, 'images');
  return result;
}

export async function deleteBanana(
  batchId: string,
  bananaId: string
): Promise<{ success: boolean; deletedCount: number }> {
  console.log('[API] Deleting banana:', batchId, bananaId);
  const result = await makeAuthenticatedRequest<{ success: boolean; deletedCount: number }>(
    `/banana/${batchId}/${bananaId}`,
    { method: 'DELETE' }
  );
  console.log('[API] Banana deleted:', result);
  return result;
}

// ============================================================================
// Image Operations
// ============================================================================

export async function updateMetadata(
  documentId: string,
  updates: UpdateMetadataRequest
): Promise<{ success: boolean; before: ImageDocument; after: ImageDocument }> {
  console.log('[API] Updating metadata for document:', documentId, updates);
  const result = await makeAuthenticatedRequest<{
    success: boolean;
    before: ImageDocument;
    after: ImageDocument;
  }>(`/metadata/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  console.log('[API] Metadata updated');
  return result;
}

export async function deleteImage(
  documentId: string
): Promise<{ success: boolean; deletedDocument: ImageDocument }> {
  console.log('[API] Deleting image:', documentId);
  const result = await makeAuthenticatedRequest<{ success: boolean; deletedDocument: ImageDocument }>(
    `/image/${documentId}`,
    { method: 'DELETE' }
  );
  console.log('[API] Image deleted');
  return result;
}

export async function getSignedReadUrl(objectPath: string): Promise<{ signedUrl: string }> {
  const result = await makeAuthenticatedRequest<{ signedUrl: string }>(
    `/gcs-signed-read-url?object_path=${encodeURIComponent(objectPath)}`
  );
  return result;
}

export async function getImageQuality(objectPath: string): Promise<ImageQuality> {
  console.log('[API] Fetching image quality for:', objectPath);
  const result = await makeAuthenticatedRequest<ImageQuality>(
    `/image-quality?object_path=${encodeURIComponent(objectPath)}`
  );
  console.log('[API] Image quality retrieved:', result.resolution, result.file_size_formatted);
  return result;
}

// ============================================================================
// Analytics
// ============================================================================

export async function getAnalyticsCounts(): Promise<AnalyticsCounts> {
  console.log('[API] Fetching analytics counts');
  const result = await makeAuthenticatedRequest<AnalyticsCounts>('/analytics/counts');
  console.log('[API] Analytics counts retrieved');
  return result;
}

export async function getAnalyticsTimeline(): Promise<TimelineDataPoint[]> {
  console.log('[API] Fetching analytics timeline');
  const result = await makeAuthenticatedRequest<TimelineDataPoint[]>('/analytics/timeline');
  console.log('[API] Timeline data retrieved:', result.length, 'data points');
  return result;
}

export async function getStageDistribution(): Promise<StageDistribution[]> {
  console.log('[API] Fetching stage distribution');
  const result = await makeAuthenticatedRequest<StageDistribution[]>('/analytics/stage-distribution');
  console.log('[API] Stage distribution retrieved');
  return result;
}

export async function getStorageAnalytics(): Promise<StorageAnalytics> {
  console.log('[API] Fetching storage analytics');
  const result = await makeAuthenticatedRequest<StorageAnalytics>('/analytics/storage');
  console.log('[API] Storage analytics retrieved:', result.totalStorageFormatted);
  return result;
}

export { ApiError };
