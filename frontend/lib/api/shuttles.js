// lib/api/shuttles.js
import { api } from "./client.js";

export async function getLiveShuttles(signal) {
  const data = await api.get("/api/shuttles/live", { signal });
  return Array.isArray(data) ? data : data?.shuttles || [];
}

export async function getLiveShuttlesByRoute(routeId, signal) {
  const data = await api.get(
    `/api/shuttles/live?route_id=${encodeURIComponent(routeId)}`,
    { signal }
  );
  return Array.isArray(data) ? data : data?.shuttles || [];
}

export async function getLiveShuttlesByStops(
  pickupStopId,
  dropoffStopId,
  signal
) {
  const q = new URLSearchParams({
    pickup_stop_id: pickupStopId,
    dropoff_stop_id: dropoffStopId,
  }).toString();
  const data = await api.get(`/api/shuttles/live?${q}`, { signal });
  return Array.isArray(data) ? data : data?.shuttles || [];
}
