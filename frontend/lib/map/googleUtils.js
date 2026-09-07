// lib/map/googleUtils.js
export function toGoogleLatLng(input) {
  if (!input) return null;

  // Handle { lat, lng } objects
  if (typeof input === "object" && !Array.isArray(input)) {
    const lat = input.lat ?? input.latitude;
    const lng = input.lng ?? input.lon ?? input.longitude;
    if (isFinite(lat) && isFinite(lng)) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    // GeoJSON format
    if (Array.isArray(input.coordinates)) {
      return toGoogleLatLng(input.coordinates);
    }
  }

  // Handle arrays [lng, lat] (GeoJSON) or [lat, lng]
  if (Array.isArray(input) && input.length >= 2) {
    const a = Number(input[0]);
    const b = Number(input[1]);
    if (!isFinite(a) || !isFinite(b)) return null;

    // Heuristic: if first value is > 90 or < -90, it's likely longitude
    const isGeoJSON = Math.abs(a) > 90;
    return isGeoJSON
      ? { lat: b, lng: a } // [lng, lat] -> {lat, lng}
      : { lat: a, lng: b }; // [lat, lng] -> {lat, lng}
  }

  return null;
}

export function stopToGoogleLatLng(stop) {
  if (!stop) return null;
  if (stop.location?.coordinates) {
    // GeoJSON: [lng, lat]
    const [lng, lat] = stop.location.coordinates;
    return { lat: Number(lat), lng: Number(lng) };
  }
  return toGoogleLatLng(stop.location ?? stop);
}

export function shuttleToGoogleLatLng(shuttle) {
  if (!shuttle) return null;

  // Prefer live ping data
  if (shuttle.ping?.lat && shuttle.ping?.lng) {
    return {
      lat: Number(shuttle.ping.lat),
      lng: Number(shuttle.ping.lng),
    };
  }

  // Fall back to currentLocation (GeoJSON)
  if (shuttle.currentLocation?.coordinates) {
    const [lng, lat] = shuttle.currentLocation.coordinates;
    return { lat: Number(lat), lng: Number(lng) };
  }

  return toGoogleLatLng(shuttle);
}
