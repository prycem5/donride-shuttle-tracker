// components/map/GoogleShuttleMarker.jsx
"use client";

import { useEffect, useRef } from "react";

/**
 * ShuttleMarker for Google Maps
 * Shows shuttle with custom bus icon and route color
 */
export default function GoogleShuttleMarker({
  map,
  shuttle,
  color = "#2563EB",
}) {
  const markerRef = useRef(null);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google || !shuttle) return;

    let position;

    // Try to get position from ping or currentLocation
    if (shuttle.ping?.lat && shuttle.ping?.lng) {
      position = { lat: shuttle.ping.lat, lng: shuttle.ping.lng };
    } else if (shuttle.currentLocation?.coordinates) {
      const [lng, lat] = shuttle.currentLocation.coordinates;
      position = { lat, lng };
    } else {
      return; // No position available
    }

    // Create custom bus icon SVG
    const busIcon = {
      url: `data:image/svg+xml,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(16,16)">
            <circle cx="0" cy="0" r="14" fill="${color}" opacity="0.9"/>
            <rect x="-6" y="-8" width="12" height="10" rx="1.5" fill="white"/>
            <circle cx="-3" cy="4" r="1.5" fill="white"/>
            <circle cx="3" cy="4" r="1.5" fill="white"/>
            <rect x="-5" y="-6" width="10" height="6" fill="${color}"/>
            <line x1="-5" y1="-3" x2="5" y2="-3" stroke="white" stroke-width="0.5"/>
            <line x1="0" y1="-6" x2="0" y2="0" stroke="white" stroke-width="0.5"/>
          </g>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16),
    };

    // Create marker
    const marker = new window.google.maps.Marker({
      position,
      map,
      title: shuttle.label || "Shuttle",
      icon: busIcon,
      zIndex: 1000, // Ensure shuttles appear above stops
    });

    // Get route info
    const routeName = shuttle.routeId?.name || shuttle.route?.name || "Route";
    const label =
      shuttle.label || `Shuttle ${(shuttle._id || shuttle.id)?.slice(-4)}`;

    // Create info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; font-family: system-ui;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #171717; font-size: 14px;">
            🚍 ${label}
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 4px; vertical-align: middle;"></span>
            ${routeName}
          </div>
          ${
            shuttle.speed
              ? `<div style="font-size: 11px; color: #888;">Speed: ${Math.round(
                  shuttle.speed
                )} km/h</div>`
              : ""
          }
        </div>
      `,
    });

    // Add click listener
    marker.addListener("click", () => {
      infoWindow.open(map, marker);
    });

    markerRef.current = marker;
    infoWindowRef.current = infoWindow;

    return () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [map, shuttle, color]);

  // Update position when shuttle moves (for live tracking)
  useEffect(() => {
    if (!markerRef.current) return;

    if (shuttle?.ping?.lat && shuttle?.ping?.lng) {
      const newPos = { lat: shuttle.ping.lat, lng: shuttle.ping.lng };
      markerRef.current.setPosition(newPos);
    }
  }, [shuttle?.ping?.lat, shuttle?.ping?.lng]);

  return null;
}
