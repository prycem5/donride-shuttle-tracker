import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing browser geolocation
 * @param {Function} onReading - Callback function called with each new GPS reading
 * @returns {Object} Geolocation state and controls
 */
export function useGeolocation(onReading) {
  const [isWatching, setIsWatching] = useState(false);
  const [lastReading, setLastReading] = useState(null);
  const [permission, setPermission] = useState("prompt"); // 'prompt' | 'granted' | 'denied' | 'unavailable'
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const onReadingRef = useRef(onReading);

  // Keep callback ref updated
  useEffect(() => {
    onReadingRef.current = onReading;
  }, [onReading]);

  // Check if geolocation is available
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setPermission("unavailable");
      setError("Geolocation is not supported by your browser");
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    setError(null);
  }, []);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported");
      setPermission("unavailable");
      return;
    }

    setIsWatching(true);
    setError(null);
    setPermission("prompt");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const handleSuccess = (position) => {
      setPermission("granted");
      setError(null);

      const reading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      setLastReading(reading);

      if (onReadingRef.current) {
        onReadingRef.current(reading);
      }
    };

    const handleError = (err) => {
      let errorMessage = "Unable to fetch location";

      switch (err.code) {
        case err.PERMISSION_DENIED:
          setPermission("denied");
          errorMessage = "Location permission denied";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable";
          break;
        case err.TIMEOUT:
          errorMessage = "Location request timed out";
          break;
        default:
          errorMessage = "Unknown geolocation error";
      }

      setError(errorMessage);
      stopWatching();
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
  }, [stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isWatching,
    lastReading,
    permission,
    error,
    startWatching,
    stopWatching,
  };
}
