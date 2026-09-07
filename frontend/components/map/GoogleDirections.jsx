// components/map/GoogleDirections.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * GoogleDirections - Draws dynamic driving route from A to B
 * Like Google Maps / Uber - calculates actual driving directions
 *
 * @param {Object} map - Google Maps instance
 * @param {Object} origin - Start point { lat, lng } or stop object
 * @param {Object} destination - End point { lat, lng } or stop object
 * @param {Array} waypoints - Optional intermediate stops
 * @param {string} color - Route line color
 * @param {Function} onRouteCalculated - Callback with distance and duration
 */
export default function GoogleDirections({
  map,
  origin,
  destination,
  waypoints = [],
  color = "#4285F4",
  onRouteCalculated,
}) {
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const [error, setError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!map || !window.google || !origin || !destination) return;

    // Initialize services
    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
    }

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          map,
          suppressMarkers: true, // We'll use our own markers
          polylineOptions: {
            strokeColor: color,
            strokeWeight: 5,
            strokeOpacity: 0.8,
          },
        }
      );
    }

    // Update polyline color if it changes
    directionsRendererRef.current.setOptions({
      polylineOptions: {
        strokeColor: color,
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    // Convert origin/destination to lat/lng
    const getLatLng = (point) => {
      // If it's already {lat, lng}
      if (point.lat && point.lng) {
        return { lat: point.lat, lng: point.lng };
      }
      // If it's a stop with location.coordinates [lng, lat]
      if (point.location?.coordinates) {
        const [lng, lat] = point.location.coordinates;
        return { lat, lng };
      }
      // If it's coordinates array [lng, lat]
      if (Array.isArray(point) && point.length === 2) {
        return { lat: point[1], lng: point[0] };
      }
      return null;
    };

    const originLatLng = getLatLng(origin);
    const destinationLatLng = getLatLng(destination);

    if (!originLatLng || !destinationLatLng) {
      console.error("GoogleDirections: Invalid origin or destination", {
        origin,
        destination,
      });
      setError("Invalid origin or destination coordinates");
      return;
    }

    // Convert waypoints
    const waypointsLatLng = waypoints
      .map((wp) => {
        const latLng = getLatLng(wp);
        return latLng ? { location: latLng, stopover: true } : null;
      })
      .filter(Boolean);

    // Request directions
    const request = {
      origin: originLatLng,
      destination: destinationLatLng,
      waypoints: waypointsLatLng.length > 0 ? waypointsLatLng : undefined,
      travelMode: window.google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false, // Keep waypoints in order
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        directionsRendererRef.current.setDirections(result);
        setError(null);

        // Extract route info
        const route = result.routes[0];
        const leg = route.legs[0];

        const info = {
          distance: leg.distance.text,
          distanceValue: leg.distance.value, // in meters
          duration: leg.duration.text,
          durationValue: leg.duration.value, // in seconds
          startAddress: leg.start_address,
          endAddress: leg.end_address,
        };

        setRouteInfo(info);

        // Call callback if provided
        if (onRouteCalculated) {
          onRouteCalculated(info);
        }
      } else {
        console.error("Directions request failed:", status);
        setError(`Failed to calculate route: ${status}`);
        directionsRendererRef.current.setDirections({ routes: [] }); // Clear old routes
      }
    });

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] }); // Clear routes
      }
    };
  }, [map, origin, destination, waypoints, color, onRouteCalculated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, []);

  return null;
}

/**
 * Helper component to show route info overlay on map
 */
export function RouteInfoOverlay({ routeInfo, onClose }) {
  if (!routeInfo) return null;

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm">Route Information</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            ✕
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">📍</span>
          <span className="font-medium">{routeInfo.distance}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">⏱️</span>
          <span className="font-medium">{routeInfo.duration}</span>
        </div>
      </div>
    </div>
  );
}
