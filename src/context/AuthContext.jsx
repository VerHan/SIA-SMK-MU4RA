/* ============================================================
   Auth Context — Manajemen State Autentikasi
   
   Menyimpan token sesi dan profil user murni di memori React/JS
   (tidak menyimpan token JWT atau kredensial di localStorage).
   ============================================================ */

import { createContext, useState, useCallback, useEffect } from 'react';
import { loginUser as apiLogin, getCurrentUser } from '../services/api';
import { setAuthToken, clearAuthToken, getAuthToken } from '../services/authToken';

const LEGACY_STORAGE_KEY = 'sia_smk_mu4ra_auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /* Bersihkan penyimpanan sesi lama di localStorage jika masih tersisa */
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Abaikan jika storage tidak tersedia */
    }

    let cancelled = false;
    async function verifyExistingMemorySession() {
      if (!getAuthToken()) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const res = await getCurrentUser();
        if (!cancelled) {
          if (res?.success && res.user) {
            setUser(res.user);
          } else {
            clearAuthToken();
            setUser(null);
          }
        }
      } catch {
        if (!cancelled) {
          clearAuthToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    verifyExistingMemorySession();

    const handleExpired = () => {
      clearAuthToken();
      setUser(null);
    };
    window.addEventListener('sia-auth-expired', handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('sia-auth-expired', handleExpired);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    try {
      const result = await apiLogin(username, password);
      if (result.success && result.user) {
        if (result.token) {
          setAuthToken(result.token);
        }
        setUser(result.user);
        return { success: true, user: result.user };
      }
      clearAuthToken();
      return { success: false, error: result.error || 'Username atau password salah.' };
    } catch {
      clearAuthToken();
      return { success: false, error: 'Terjadi kesalahan jaringan. Coba lagi.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Abaikan */
    }
  }, []);

  const hasRole = useCallback((allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

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
