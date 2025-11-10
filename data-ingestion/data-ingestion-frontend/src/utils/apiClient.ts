/**
 * API Client for BananaFate Data Ingestion
 * Handles communication with the FastAPI backend
 */

import { getAuthToken } from './authUtils';

// Get the backend URL from environment variable (set at build time)
// In development: empty string (uses Vite proxy)
// In production: full backend URL (e.g., https://data-ingestion-backend-xxx.run.app)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Logout callback for automatic logout on auth failures
let logoutCallback: (() => void) | null = null;

/**
 * Register a callback to be called when authentication fails
 */
export function setLogoutCallback(callback: () => void): void {
  logoutCallback = callback;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Login with password and receive JWT token
 */
export async function login(password: string): Promise<{ token: string; expiresIn: number }> {
  console.log('[API] Attempting login');

  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[API] Login failed:', response.status, error);
    throw new ApiError(response.status, response.status === 401 ? 'Invalid password' : 'Login failed');
  }

  const result = await response.json();
  console.log('[API] ✓ Login successful');
  return result;
}

/**
 * Generate a signed URL for uploading an image to GCS
 */
export async function generateSignedUrl(
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<{ signedUrl: string; objectPath: string; expiresIn: number }> {
  console.log('[API] Requesting signed URL for:', filename);
  console.log('[API] Backend URL:', BACKEND_URL || '(using proxy)');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/generate-signed-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filename, contentType }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API] Signed URL response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Signed URL request failed:', response.status, error);

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(response.status, `Failed to generate signed URL: ${error}`);
    }

    const result = await response.json();
    console.log('[API] ✓ Signed URL generated successfully');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[API] Signed URL request timed out after 30 seconds');
      throw new ApiError(408, 'Request timed out - please check your connection');
    }
    throw error;
  }
}

/**
 * Upload an image blob to GCS using a signed URL
 */
export async function uploadToGcs(signedUrl: string, imageBlob: Blob): Promise<void> {
  console.log('[GCS] Starting upload to GCS');
  console.log('[GCS] Blob size:', imageBlob.size, 'bytes');
  console.log('[GCS] Blob type:', imageBlob.type);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: imageBlob,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[GCS] Upload response:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error body');
      console.error('[GCS] Upload failed:', response.status, errorBody);
      throw new ApiError(response.status, `GCS upload failed: ${response.statusText}`);
    }

    console.log('[GCS] ✓ Upload successful');
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[GCS] Upload timed out after 30 seconds');
      throw new ApiError(408, 'Upload timed out - please check your connection');
    }
    throw error;
  }
}

/**
 * Save image metadata to MongoDB
 */
export async function saveMetadata(metadata: {
  batchId: string;
  bananaId: string;
  captureTime: string;
  stage: string;
  notes: string;
  objectPath: string;
  fileSizeBytes?: number;
}): Promise<{ success: boolean; documentId: string }> {
  console.log('[API] Saving metadata to MongoDB');
  console.log('[API] Metadata:', metadata);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const token = getAuthToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/save-metadata`, {
      method: 'POST',
      headers,
      body: JSON.stringify(metadata),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API] Save metadata response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Save metadata failed:', response.status, error);

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(response.status, `Failed to save metadata: ${error}`);
    }

    const result = await response.json();
    console.log('[API] ✓ Metadata saved, document ID:', result.documentId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[API] Save metadata timed out after 30 seconds');
      throw new ApiError(408, 'Request timed out - please check your connection');
    }
    throw error;
  }
}

/**
 * Look up batch ID and capture history for a given banana ID
 */
export async function lookupBanana(
  bananaId: string
): Promise<{
  found: boolean;
  batchId?: string;
  lastStage?: string;
  lastCaptureDate?: string;
  lastObjectPath?: string;
  captureCount?: number;
}> {
  console.log('[API] Looking up banana:', bananaId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/lookup-banana/${encodeURIComponent(bananaId)}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API] Lookup response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Lookup failed:', response.status, error);

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(response.status, `Failed to lookup banana: ${error}`);
    }

    const result = await response.json();
    console.log('[API] Lookup result:', result.found
      ? `✓ Found in ${result.batchId} (${result.lastStage}, ${result.captureCount} captures)`
      : 'ℹ Not found (new banana)');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[API] Lookup timed out after 30 seconds');
      throw new ApiError(408, 'Request timed out - please check your connection');
    }
    throw error;
  }
}

/**
 * Get mobile dashboard analytics
 */
export async function getMobileDashboard(): Promise<{
  totalImages: number;
  progressToGoal: number;
  goal: number;
  stageDistribution: Array<{ stage: string; count: number }>;
  storage: {
    totalStorageBytes: number;
    totalStorageFormatted: string;
    totalPhotos: number;
    averagePerPhotoBytes: number;
    averagePerPhotoFormatted: string;
    estimatedMonthlyCostUSD: number;
  };
}> {
  console.log('[API] Getting mobile dashboard analytics');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/analytics/mobile-dashboard`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API] Mobile dashboard response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Mobile dashboard failed:', response.status, error);

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(response.status, `Failed to get mobile dashboard: ${error}`);
    }

    const result = await response.json();
    console.log('[API] ✓ Mobile dashboard retrieved');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[API] Mobile dashboard timed out after 30 seconds');
      throw new ApiError(408, 'Request timed out - please check your connection');
    }
    throw error;
  }
}

/**
 * Get a signed read URL for viewing a GCS image
 */
export async function getSignedReadUrl(
  objectPath: string
): Promise<{ signedUrl: string; objectPath: string; expiresIn: number }> {
  console.log('[API] Requesting signed read URL for:', objectPath);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${BACKEND_URL}/gcs-signed-read-url?object_path=${encodeURIComponent(objectPath)}`,
      {
        method: 'GET',
        headers,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    console.log('[API] Signed read URL response:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[API] Signed read URL request failed:', response.status, error);

      // Automatically logout on authentication failures
      if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.error('[API] Authentication failed, logging out automatically');
        logoutCallback();
      }

      throw new ApiError(response.status, `Failed to get signed read URL: ${error}`);
    }

    const result = await response.json();
    console.log('[API] ✓ Signed read URL generated successfully');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[API] Signed read URL request timed out after 30 seconds');
      throw new ApiError(408, 'Request timed out - please check your connection');
    }
    throw error;
  }
}
