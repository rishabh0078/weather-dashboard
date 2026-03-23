import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLocationFromBrowser } from '../services/weatherApi';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLocationName = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&latitude=${lat}&longitude=${lon}`
      );
      // Use reverse geocoding via nominatim as fallback
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      if (nomRes.ok) {
        const data = await nomRes.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
        const country = data.address?.country || '';
        setLocationName(city ? `${city}, ${country}` : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
      }
    } catch {
      setLocationName(`${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
    }
  }, []);

  useEffect(() => {
    getLocationFromBrowser()
      .then((loc) => {
        setLocation(loc);
        setLoading(false); // Unblock the app immediately!
        fetchLocationName(loc.lat, loc.lon); // Fetch city name in background
      })
      .catch((err) => {
        // Default to New Delhi if GPS fails or times out
        const defaultLoc = { lat: 28.6139, lon: 77.2090 };
        setLocation(defaultLoc);
        setError('GPS access denied or slow. Showing data for New Delhi.');
        setLoading(false); // Unblock immediately
        fetchLocationName(defaultLoc.lat, defaultLoc.lon); // Get name for fallback
      });
  }, [fetchLocationName]);

  return (
    <LocationContext.Provider value={{ location, locationName, error, loading, setLocation, setLocationName }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
