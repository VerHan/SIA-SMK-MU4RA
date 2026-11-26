import { useState, useEffect, useCallback } from 'react';
import { SCHOOL_GEOFENCE as DEFAULT_GEOFENCE } from '../config/constants';
import { getGeofenceSettings, updateGeofenceSettings } from '../services/api';

const SETTINGS_KEY = 'sia_settings';

function readCachedGeofence() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.geofence?.latitude === -6.5295) {
        parsed.geofence = DEFAULT_GEOFENCE;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }
      if (parsed.geofence) return parsed;
    }
  } catch (error) {
    console.error('Failed to parse settings from localStorage', error);
  }
  return { geofence: DEFAULT_GEOFENCE };
}

export function useSettings() {
  const [settings, setSettings] = useState(() => readCachedGeofence());
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGeofenceSettings()
      .then((res) => {
        if (!cancelled && res?.success && res.data) {
          setSettings((prev) => {
            const next = { ...prev, geofence: res.data };
            try {
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
            } catch {
              /* Abaikan */
            }
            return next;
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateGeofence = useCallback(async (newGeofence) => {
    const res = await updateGeofenceSettings(newGeofence);
    if (res?.success && res.data) {
      setSettings((prev) => {
        const next = { ...prev, geofence: res.data };
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        } catch {
          /* Abaikan */
        }
        return next;
      });
      return { success: true, data: res.data, message: res.message };
    }
    return { success: false, error: res?.error || 'Gagal menyimpan pengaturan geofence.' };
  }, []);

  return { settings, loadingSettings, updateGeofence };
}
