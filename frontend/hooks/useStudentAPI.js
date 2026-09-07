// hooks/useStudentAPI.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useStudentAPI() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  // All live shuttles (shown on map immediately)
  const [liveShuttles, setLiveShuttles] = useState([]);
  const [liveShuttlesLoading, setLiveShuttlesLoading] = useState(false);

  // Results for a user query (pickup/dropoff)
  const [isFinding, setIsFinding] = useState(false);
  const [findError, setFindError] = useState(null);
  const [availableShuttles, setAvailableShuttles] = useState([]);

  // Simple in-memory cache to avoid refetching unchanged lists
  const didInitRef = useRef(false);

  // ---- helpers -------------------------------------------------------------

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  function parseList(data, key) {
    // Accept array or { success, data } or { key: [...] }
    if (Array.isArray(data)) return data;
    if (data?.success && Array.isArray(data?.data)) return data.data;
    if (key && Array.isArray(data?.[key])) return data[key];
    return [];
  }

  // ---- init loads ----------------------------------------------------------

  const loadStops = useCallback(async () => {
    if (!apiBaseUrl) return;
    setStopsLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/stops`, { cache: "no-store" });
      const data = await safeJson(res);
      console.log("🚏 [STOPS API RAW RESPONSE]", data);
      if (Array.isArray(data?.data)) {
        data.data.slice(0, 3).forEach((stop) => {
          console.log(
            "🟢 STOP:",
            stop.name,
            "coords=",
            stop.location?.coordinates,
            "expected format → [lng, lat]"
          );
        });
      }
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }

      const list = parseList(data, "stops");
      setStops(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load stops";
      setLastError(msg);
    } finally {
      setStopsLoading(false);
    }
  }, [apiBaseUrl]);

  const loadRoutes = useCallback(async () => {
    if (!apiBaseUrl) return;
    setRoutesLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/routes`, {
        cache: "no-store",
      });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }

      const list = parseList(data, "routes");
      setRoutes(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load routes";
      setLastError(msg);
    } finally {
      setRoutesLoading(false);
    }
  }, [apiBaseUrl]);

  // Load all live shuttles (for showing on map immediately)
  const loadLiveShuttles = useCallback(async () => {
    if (!apiBaseUrl) return;
    setLiveShuttlesLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/shuttles/live`, {
        cache: "no-store",
      });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }

      const list = parseList(data, "shuttles");
      setLiveShuttles(list);
    } catch (err) {
      console.error("Failed to load live shuttles:", err);
      setLiveShuttles([]);
    } finally {
      setLiveShuttlesLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadStops();
    loadRoutes();
    loadLiveShuttles();
  }, [loadStops, loadRoutes, loadLiveShuttles]);

  // Refresh live shuttles every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveShuttles();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadLiveShuttles]);

  // ---- find shuttles by pickup/dropoff ------------------------------------

  const findShuttlesByStops = useCallback(
    async (pickupStopId, dropoffStopId) => {
      if (!apiBaseUrl) return [];
      if (!pickupStopId || !dropoffStopId || pickupStopId === dropoffStopId)
        return [];

      setIsFinding(true);
      setFindError(null);
      setAvailableShuttles([]);

      try {
        const q = new URLSearchParams({
          pickup_stop_id: pickupStopId,
          dropoff_stop_id: dropoffStopId,
        }).toString();

        const res = await fetch(`${apiBaseUrl}/api/shuttles/live?${q}`, {
          cache: "no-store",
        });
        const data = await safeJson(res);

        if (!res.ok) {
          throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        }

        const list = parseList(data, "shuttles");
        setAvailableShuttles(list);
        return list;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to fetch shuttles";
        setFindError(msg);
        setAvailableShuttles([]);
        return [];
      } finally {
        setIsFinding(false);
      }
    },
    [apiBaseUrl]
  );

  // ---- arrivals (optional helpers) ----------------------------------------

  const getStopArrivals = useCallback(
    async (stopId, limit = 5) => {
      if (!apiBaseUrl || !stopId) return [];
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/arrivals/stop/${encodeURIComponent(
            stopId
          )}?limit=${limit}`,
          { cache: "no-store" }
        );
        const data = await safeJson(res);
        if (!res.ok)
          throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return parseList(data, "arrivals");
      } catch {
        return [];
      }
    },
    [apiBaseUrl]
  );

  const getShuttleArrivals = useCallback(
    async (shuttleId) => {
      if (!apiBaseUrl || !shuttleId) return [];
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/arrivals/shuttle/${encodeURIComponent(shuttleId)}`,
          { cache: "no-store" }
        );
        const data = await safeJson(res);
        if (!res.ok)
          throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
        return parseList(data, "arrivals");
      } catch {
        return [];
      }
    },
    [apiBaseUrl]
  );

  // ---- derived -------------------------------------------------------------

  const loadingAny = useMemo(
    () => stopsLoading || routesLoading,
    [stopsLoading, routesLoading]
  );

  return {
    // data
    stops,
    routes,
    availableShuttles,
    liveShuttles,

    // statuses
    stopsLoading,
    routesLoading,
    liveShuttlesLoading,
    loadingAny,
    isFinding,
    lastError,
    findError,

    // actions
    reloadStops: loadStops,
    reloadRoutes: loadRoutes,
    reloadLiveShuttles: loadLiveShuttles,
    findShuttlesByStops,
    getStopArrivals,
    getShuttleArrivals,
  };
}
