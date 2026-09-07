// lib/api/arrivals.js
import { api } from "./client.js";

export async function getStopArrivals(stopId, limit = 5, signal) {
  const data = await api.get(
    `/api/arrivals/stop/${encodeURIComponent(stopId)}?limit=${limit}`,
    { signal }
  );
  return Array.isArray(data) ? data : data?.arrivals || [];
}

export async function getShuttleArrivals(shuttleId, signal) {
  const data = await api.get(
    `/api/arrivals/shuttle/${encodeURIComponent(shuttleId)}`,
    { signal }
  );
  return Array.isArray(data) ? data : data?.arrivals || [];
}

export async function getRouteArrivals(routeId, signal) {
  const data = await api.get(
    `/api/arrivals/route/${encodeURIComponent(routeId)}`,
    { signal }
  );
  return Array.isArray(data) ? data : data?.arrivals || [];
}
