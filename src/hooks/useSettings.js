import { useState, useEffect } from 'react';
import { SCHOOL_GEOFENCE as DEFAULT_GEOFENCE } from '../config/constants';

const SETTINGS_KEY = 'sia_settings';

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If old mock coordinates were saved, migrate to new official coordinates
        if (parsed.geofence?.latitude === -6.5295) {
          parsed.geofence = DEFAULT_GEOFENCE;
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse settings from localStorage', error);
    }
    return { geofence: DEFAULT_GEOFENCE };
  });

  const updateGeofence = (newGeofence) => {
    const newSettings = { ...settings, geofence: newGeofence };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, updateGeofence };
}
