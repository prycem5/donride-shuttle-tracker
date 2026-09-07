// lib/map/coords.js
// Converts any coordinate format into [lat, lng] that Leaflet expects.

export function toLatLng(input) {
  if (!input) return null;

  // Handle objects like { lat, lng } or { latitude, longitude }
  if (typeof input === "object" && !Array.isArray(input)) {
    const lat = input.lat ?? input.latitude;
    const lng = input.lng ?? input.lon ?? input.longitude;
    if (isFinite(lat) && isFinite(lng)) return [Number(lat), Number(lng)];
    // GeoJSON { type: "Point", coordinates: [lng, lat] }
    if (Array.isArray(input.coordinates)) return fromArray(input.coordinates);
    return null;
  }

  // Handle raw arrays like [lng, lat] or [lat, lng]
  if (Array.isArray(input)) return fromArray(input);

  return null;
}

function fromArray(coords) {
  const a = Number(coords[0]);
  const b = Number(coords[1]);
  if (!isFinite(a) || !isFinite(b)) return null;

  // Heuristic check
  const looksLatLng = Math.abs(a) <= 90 && Math.abs(b) <= 180;
  return looksLatLng ? [a, b] : [b, a]; // Flip if it's GeoJSON ([lng, lat])
}

// Helper to normalize stop objects
export function stopToLatLng(stop) {
  if (!stop) return null;
  if (stop.location?.coordinates) return toLatLng(stop.location.coordinates);
  return toLatLng(stop.location ?? stop);
}

// Helper to normalize shuttle objects
export function shuttleToLatLng(shuttle) {
  if (!shuttle) return null;
  if (shuttle.ping)
    return toLatLng({ lat: shuttle.ping.lat, lng: shuttle.ping.lng });
  if (shuttle.currentLocation?.coordinates)
    return toLatLng(shuttle.currentLocation.coordinates);
  return toLatLng(shuttle);
}
