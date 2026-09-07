// components/map/GoogleMultiRoute.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * GoogleMultiRoute - Draws multiple route segments on the map
 * Handles the issue of multiple DirectionsRenderer instances conflicting
 *
 * @param {Object} map - Google Maps instance
 * @param {Array} routes - Array of route segments: [{ origin, destination, color }]
 * @param {Function} onRouteCalculated - Callback with combined route info
 */
export default function GoogleMultiRoute({
  map,
  routes = [],
  onRouteCalculated,
}) {
  const renderersRef = useRef([]);
  const serviceRef = useRef(null);
  const [routeInfos, setRouteInfos] = useState([]);

  useEffect(() => {
    if (!map || !window.google || routes.length === 0) return;

    // Initialize service once
    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.DirectionsService();
    }

    // Clear old renderers
    renderersRef.current.forEach((renderer) => {
      if (renderer) {
        renderer.setMap(null);
      }
    });
    renderersRef.current = [];

    // Helper to convert various formats to {lat, lng}
    const getLatLng = (point) => {
      if (!point) return null;

      // If it's already {lat, lng}
      if (typeof point.lat === "number" && typeof point.lng === "number") {
        return { lat: point.lat, lng: point.lng };
      }

      // If it's a stop with location.coordinates [lng, lat]
      if (point.location?.coordinates) {
        const [lng, lat] = point.location.coordinates;
        if (typeof lat === "number" && typeof lng === "number") {
          return { lat, lng };
        }
      }

      // If it's coordinates array [lng, lat]
      if (Array.isArray(point) && point.length === 2) {
        return { lat: point[1], lng: point[0] };
      }

      return null;
    };

    const infos = [];

    // Process each route segment
    routes.forEach((route, index) => {
      const { origin, destination, color = "#3B82F6" } = route;

      const originLatLng = getLatLng(origin);
      const destinationLatLng = getLatLng(destination);

      if (!originLatLng || !destinationLatLng) {
        console.warn(
          `GoogleMultiRoute: Invalid coordinates for route ${index}`,
          {
            origin,
            destination,
            originLatLng,
            destinationLatLng,
          }
        );
        return;
      }

      // Create renderer for this route
      const renderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: true, // Don't auto-zoom to fit
        polylineOptions: {
          strokeColor: color,
          strokeWeight: 5,
          strokeOpacity: 0.8,
          zIndex: 100 - index, // First routes on top
        },
      });

      renderersRef.current.push(renderer);

      // Request directions
      const request = {
        origin: originLatLng,
        destination: destinationLatLng,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      serviceRef.current.route(request, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          renderer.setDirections(result);

          // Extract route info
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            infos[index] = {
              distance: leg.distance.text,
              distanceValue: leg.distance.value,
              duration: leg.duration.text,
              durationValue: leg.duration.value,
            };
            setRouteInfos([...infos]);

            // Callback with first route info (usually the main route)
            if (index === 0 && onRouteCalculated) {
              onRouteCalculated(infos[0]);
            }
          }
        } else {
          console.error(
            `Directions request failed for route ${index}:`,
            status,
            {
              origin: originLatLng,
              destination: destinationLatLng,
            }
          );

          // Common issues:
          // - ZERO_RESULTS: No route found between points
          // - REQUEST_DENIED: API key doesn't have Directions API enabled
          // - OVER_QUERY_LIMIT: Too many requests
          if (status === "REQUEST_DENIED") {
            console.error(
              "⚠️ Directions API may not be enabled for your Google Maps API key. Enable it at: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com"
            );
          }
        }
      });
    });

    // Cleanup
    return () => {
      renderersRef.current.forEach((renderer) => {
        if (renderer) {
          renderer.setMap(null);
        }
      });
      renderersRef.current = [];
    };
  }, [
    map,
    JSON.stringify(
      routes.map((r) => ({
        origin: r.origin?.location?.coordinates || r.origin,
        destination: r.destination?.location?.coordinates || r.destination,
        color: r.color,
      }))
    ),
  ]);

  return null;
}
