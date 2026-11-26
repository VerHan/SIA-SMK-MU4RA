/* ============================================================
   Auth Context — Manajemen State Autentikasi
   
   Menyimpan token sesi dan profil user murni di memori React/JS
   (tidak menyimpan token JWT atau kredensial di localStorage).
   ============================================================ */

import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { loginUser as apiLogin, logoutUser as apiLogout, getCurrentUser } from '../services/api';
import { setAuthToken, clearAuthToken } from '../services/authToken';
import { clearLastRoute } from '../utils/sessionRouting';

const LEGACY_STORAGE_KEY = 'sia_smk_mu4ra_auth';

export const AuthContext = createContext(null);

function normalizeClientUser(rawUser) {
  if (!rawUser || typeof rawUser !== 'object') return null;
  const role = typeof rawUser.role === 'string' ? rawUser.role.trim().toLowerCase() : '';
  return { ...rawUser, role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const authGenRef = useRef(0);

  useEffect(() => {
    /* Bersihkan penyimpanan token lama di localStorage jika masih tersisa */
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Abaikan jika storage tidak tersedia */
    }

    let cancelled = false;
    const initGen = authGenRef.current;

    async function restoreSessionFromServer() {
      try {
        /* Memulihkan sesi dari HttpOnly cookie (jika PWA baru dibuka kembali) atau Bearer memori */
        const res = await getCurrentUser();
        if (!cancelled && authGenRef.current === initGen) {
          if (res?.success && res.user) {
            if (res.token) {
              setAuthToken(res.token);
            }
            setUser(normalizeClientUser(res.user));
          } else {
            clearAuthToken();
            setUser(null);
          }
        }
      } catch {
        if (!cancelled && authGenRef.current === initGen) {
          clearAuthToken();
          setUser(null);
        }
      } finally {
        if (!cancelled && authGenRef.current === initGen) {
          setIsLoading(false);
        }
      }
    }

    restoreSessionFromServer();

    const handleExpired = () => {
      authGenRef.current += 1;
      clearAuthToken();
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('sia-auth-expired', handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('sia-auth-expired', handleExpired);
    };
  }, []);

  const login = useCallback(async (username, password, rememberMe = true) => {
    authGenRef.current += 1;
    try {
      const result = await apiLogin(username, password, rememberMe);
      if (result.success && result.user) {
        const normalized = normalizeClientUser(result.user);
        if (result.token) {
          setAuthToken(result.token);
        }
        setUser(normalized);
        setIsLoading(false);
        return { success: true, user: normalized };
      }
      clearAuthToken();
      return { success: false, error: result.error || 'Username atau password salah.' };
    } catch {
      clearAuthToken();
      return { success: false, error: 'Terjadi kesalahan jaringan. Coba lagi.' };
    }
  }, []);

  const logout = useCallback(async () => {
    authGenRef.current += 1;
    clearAuthToken();
    setUser(null);
    clearLastRoute();
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Abaikan */
    }
    await apiLogout();
  }, []);

  const hasRole = useCallback((allowedRoles) => {
    if (!user || !Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const capabilities = user?.capabilities || {
    canAccessAdmin: user?.role === 'admin',
    canManageUsers: user?.role === 'admin',
    canInputPiket: user?.role === 'admin' || user?.role === 'staff' || (user?.role === 'guru' && Boolean(user?.isPiket)),
    canInputMapel: user?.role === 'admin' || user?.role === 'guru',
    canMonitorSchool: ['admin', 'staff', 'kepsek'].includes(user?.role),
    canMonitorHomeroom: ['admin', 'staff', 'kepsek'].includes(user?.role) || (user?.role === 'guru' && Array.isArray(user?.homeroomClasses) && user.homeroomClasses.length > 0),
    canMonitorOwnChild: user?.role === 'wali_murid' && Boolean(user?.studentId),
  };

  const hasCapability = useCallback((required) => {
    if (!user) return false;
    if (Array.isArray(required)) {
      return required.some(cap => Boolean(capabilities[cap]));
    }
    return Boolean(capabilities[required]);
  }, [user, capabilities]);

  const homeroomClasses = Array.isArray(user?.homeroomClasses) ? user.homeroomClasses : [];
  const isPiket = user?.role === 'guru' && Boolean(user?.isPiket);
  const isHomeroomTeacher = user?.role === 'guru' && homeroomClasses.length > 0;
  const isGuardian = user?.role === 'wali_murid';

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole,
    hasCapability,
    capabilities,
    isPiket,
    isHomeroomTeacher,
    homeroomClasses,
    isGuardian,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
