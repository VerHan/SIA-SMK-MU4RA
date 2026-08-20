import { useState, useEffect } from 'react';
import { SCHOOL_GEOFENCE as DEFAULT_GEOFENCE } from '../config/constants';

const SETTINGS_KEY = 'sia_settings';

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
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
