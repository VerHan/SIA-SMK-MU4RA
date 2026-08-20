/* Custom hook untuk state yang persisten di localStorage */

import { useState, useEffect } from 'react';

/**
 * useLocalStorage — seperti useState tapi disimpan di localStorage
 * @param {string} key - Key localStorage
 * @param {any} initialValue - Nilai default jika belum ada di storage
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      console.warn(`[useLocalStorage] Gagal menyimpan key "${key}"`);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
