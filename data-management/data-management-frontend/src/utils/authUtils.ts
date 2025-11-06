/**
 * Authentication utilities
 * Handles token storage and validation
 */

const TOKEN_KEY = 'authToken';
const EXPIRATION_KEY = 'authExpiration';

/**
 * Store authentication token and expiration
 */
export function storeAuthToken(token: string, expiresIn: number): void {
  const expirationTime = Date.now() + expiresIn * 1000;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRATION_KEY, expirationTime.toString());

  console.log('[AUTH] Token stored, expires at:', new Date(expirationTime).toLocaleString());
}

/**
 * Get stored authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Check if authentication token is valid and not expired
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiration = localStorage.getItem(EXPIRATION_KEY);

  if (!token || !expiration) {
    return false;
  }

  const expirationTime = parseInt(expiration, 10);
  const isValid = Date.now() < expirationTime;

  if (!isValid) {
    console.log('[AUTH] Token expired');
    clearAuthToken();
  }

  return isValid;
}

/**
 * Clear authentication token
 */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRATION_KEY);
  console.log('[AUTH] Token cleared');
}

/**
 * Get remaining time until token expiration (in seconds)
 */
export function getTokenExpirationTime(): number | null {
  const expiration = localStorage.getItem(EXPIRATION_KEY);

  if (!expiration) {
    return null;
  }

  const expirationTime = parseInt(expiration, 10);
  const remainingMs = expirationTime - Date.now();

  return Math.max(0, Math.floor(remainingMs / 1000));
}
