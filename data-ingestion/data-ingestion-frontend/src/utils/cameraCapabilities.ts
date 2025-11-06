/**
 * Camera Capabilities Detection and Monitoring
 *
 * Provides utilities for detecting available camera capture methods,
 * monitoring resolution, and determining optimal capture strategy.
 */

export type CaptureMethod = 'imagecapture' | 'native-input' | 'getusermedia-canvas';
export type CaptureQuality = 'high' | 'medium' | 'low';

export interface CameraMethod {
  name: CaptureMethod;
  available: boolean;
  quality: CaptureQuality;
  description: string;
  resolutionInfo?: string;
}

export interface SafariInfo {
  isSafari: boolean;
  version: number | null;
  isIOS: boolean;
  supportsImageCapture: boolean;
}

export interface StreamResolution {
  width: number;
  height: number;
  megapixels: string;
}

/**
 * Detect Safari browser and version on iOS
 */
export function detectSafariVersion(): SafariInfo {
  const ua = navigator.userAgent;
  const isIOS = /iP(ad|od|hone)/i.test(ua) && /WebKit/i.test(ua);
  const isSafari = isIOS && !/(CriOS|FxiOS|OPiOS|mercury)/i.test(ua);

  let version: number | null = null;
  if (isSafari) {
    const versionMatch = ua.match(/Version\/(\d+)/);
    if (versionMatch) {
      version = parseInt(versionMatch[1], 10);
    }
  }

  // Safari 18.4+ supports ImageCapture API
  const supportsImageCapture = 'ImageCapture' in window && (!isSafari || (version !== null && version >= 18.4));

  return { isSafari, version, isIOS, supportsImageCapture };
}

/**
 * Detect all available camera capture methods in order of quality
 */
export async function detectCameraMethods(): Promise<CameraMethod[]> {
  const methods: CameraMethod[] = [];
  const safari = detectSafariVersion();

  // 1. Check for ImageCapture API (highest quality on supported browsers)
  if ('ImageCapture' in window && 'mediaDevices' in navigator) {
    const qualityNote = safari.isIOS && safari.version && safari.version >= 18.4
      ? 'Safari 18.4+ on iOS'
      : 'Supported';

    methods.push({
      name: 'imagecapture',
      available: true,
      quality: 'high',
      description: 'ImageCapture API - High quality still photos',
      resolutionInfo: qualityNote
    });
  }

  // 2. Check for native file input (best for iOS Safari < 18.4)
  if ('HTMLInputElement' in window) {
    const resInfo = safari.isIOS
      ? 'Full device camera resolution (12MP+)'
      : 'Device-dependent';

    methods.push({
      name: 'native-input',
      available: true,
      quality: 'high',
      description: 'Native camera via file input',
      resolutionInfo: resInfo
    });
  }

  // 3. Check for getUserMedia (universal fallback)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const resInfo = safari.isIOS
      ? 'Up to 1280x720 (iOS Safari limitation)'
      : 'Up to 1920x1080 (typical)';

    methods.push({
      name: 'getusermedia-canvas',
      available: true,
      quality: safari.isIOS ? 'medium' : 'high',
      description: 'Live video stream with canvas capture',
      resolutionInfo: resInfo
    });
  }

  return methods;
}

/**
 * Get recommended capture method for current device
 */
export function getRecommendedMethod(): CaptureMethod {
  const safari = detectSafariVersion();

  // Safari 18.4+ on iOS: use ImageCapture API
  if (safari.isIOS && safari.supportsImageCapture) {
    return 'imagecapture';
  }

  // iOS Safari < 18.4: use native file input for best quality
  if (safari.isIOS && safari.isSafari) {
    return 'native-input';
  }

  // Desktop or non-Safari mobile: prefer getUserMedia for live preview
  return 'getusermedia-canvas';
}

/**
 * Get actual resolution from getUserMedia stream
 */
export async function getStreamResolution(stream: MediaStream): Promise<StreamResolution> {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    const settings = videoTrack.getSettings();
    const width = settings.width || 0;
    const height = settings.height || 0;
    const megapixels = ((width * height) / 1000000).toFixed(2);

    return { width, height, megapixels };
  }
  return { width: 0, height: 0, megapixels: '0.00' };
}

/**
 * Get camera capabilities (max resolution available from hardware)
 */
export async function getCameraCapabilities(stream: MediaStream): Promise<MediaTrackCapabilities | null> {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack && 'getCapabilities' in videoTrack) {
    return videoTrack.getCapabilities();
  }
  return null;
}

/**
 * Get resolution info from an image file
 */
export function getImageResolution(file: File): Promise<StreamResolution> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const megapixels = ((width * height) / 1000000).toFixed(2);
      resolve({ width, height, megapixels });
    };
    img.onerror = reject;

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get resolution info from a data URL
 */
export function getDataUrlResolution(dataUrl: string): Promise<StreamResolution> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const megapixels = ((width * height) / 1000000).toFixed(2);
      resolve({ width, height, megapixels });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Request highest possible resolution from getUserMedia
 */
export async function requestHighResolutionStream(): Promise<MediaStream> {
  // Use unrealistically high "ideal" constraints to get max resolution
  // iOS Safari will still cap at 720p, but this ensures best quality
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 4096 },
      height: { ideal: 4096 }
    },
    audio: false
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Format resolution for display
 */
export function formatResolution(res: StreamResolution): string {
  if (res.width === 0 || res.height === 0) {
    return 'Unknown';
  }
  return `${res.width}×${res.height} (${res.megapixels}MP)`;
}

/**
 * Get quality badge color based on capture method
 */
export function getQualityBadgeColor(method: CaptureMethod, safari: SafariInfo): string {
  if (method === 'native-input' || (method === 'imagecapture' && safari.supportsImageCapture)) {
    return 'bg-green-500';
  }
  if (method === 'getusermedia-canvas' && !safari.isIOS) {
    return 'bg-blue-500';
  }
  return 'bg-yellow-500';
}

/**
 * Get quality label based on capture method
 */
export function getQualityLabel(method: CaptureMethod, safari: SafariInfo): string {
  if (method === 'native-input' && safari.isIOS) {
    return 'Best Quality';
  }
  if (method === 'imagecapture' && safari.supportsImageCapture) {
    return 'High Quality';
  }
  if (method === 'getusermedia-canvas') {
    return safari.isIOS ? 'Medium Quality' : 'Good Quality';
  }
  return 'Standard';
}
