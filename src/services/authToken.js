/* ============================================================
   In-Memory Auth Token Store
   Menyimpan Bearer JWT token murni di memori JavaScript
   (tidak pernah ditulis ke localStorage atau sessionStorage).
   ============================================================ */

let memoryToken = null;

export function getAuthToken() {
  return memoryToken;
}

export function setAuthToken(token) {
  memoryToken = typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function clearAuthToken() {
  memoryToken = null;
}

export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (memoryToken) {
    headers.Authorization = `Bearer ${memoryToken}`;
  }
  return headers;
}

export function notifyAuthExpired() {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sia-auth-expired'));
  }
}
