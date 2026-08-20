/* ============================================================
   Auth Context — Manajemen State Autentikasi
   
   Menyediakan state login/logout, data user, dan role 
   ke seluruh komponen melalui React Context.
   ============================================================ */

import { createContext, useState, useCallback, useEffect } from 'react';
import { loginUser as apiLogin } from '../services/api';

/* Key untuk localStorage — jangan ubah agar session tetap konsisten */
const AUTH_STORAGE_KEY = 'sia_smk_mu4ra_auth';

/* Buat context */
export const AuthContext = createContext(null);

/**
 * AuthProvider — Bungkus komponen root dengan provider ini
 * agar semua child bisa mengakses auth state.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Cek session yang tersimpan saat pertama kali mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        /* Validasi sederhana: pastikan data punya id dan role */
        if (parsed && parsed.id && parsed.role) {
          setUser(parsed);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch {
      /* Data corrupt — hapus dan mulai fresh */
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login — autentikasi user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      const result = await apiLogin(username, password);
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
        return { success: true, user: result.user };
      }
      return { success: false, error: result.error || 'Username atau password salah.' };
    } catch (err) {
      return { success: false, error: 'Terjadi kesalahan jaringan. Coba lagi.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout — hapus session dan redirect
   */
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  /**
   * Cek apakah user memiliki salah satu role yang diizinkan
   * @param {string[]} allowedRoles - Array role yang diizinkan
   * @returns {boolean}
   */
  const hasRole = useCallback((allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  /* Value yang akan disediakan ke seluruh app */
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
