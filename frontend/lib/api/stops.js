// lib/api/stops.js
import { api } from "./client.js";

export async function getAllStops(signal) {
  // Expected shapes: [{...}] OR {stops:[...]}
  const data = await api.get("/api/stops", { signal });
  return Array.isArray(data) ? data : data?.stops || [];
}

export async function getStopById(id, signal) {
  return api.get(`/api/stops/${encodeURIComponent(id)}`, { signal });
}

export async function getNearbyStops(lat, lng, radius = 800, signal) {
  return api.get(`/api/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
    signal,
  });
}
