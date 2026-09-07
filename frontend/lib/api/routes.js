// lib/api/routes.js
import { api } from "./client.js";

export async function getAllRoutes(signal) {
  const data = await api.get("/api/routes", { signal });
  return Array.isArray(data) ? data : data?.routes || [];
}
console.log(getAllRoutes());

export async function getRouteById(id, signal) {
  return api.get(`/api/routes/${encodeURIComponent(id)}`, { signal });
}
