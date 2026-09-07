// components/map/GoogleStopMarker.jsx
"use client";

import { useEffect, useRef } from "react";

/**
 * StopMarker for Google Maps
 * Works with your existing stop data structure
 */
export default function GoogleStopMarker({
  map,
  stop,
  isPickup,
  isDropoff,
  onClick,
}) {
  const markerRef = useRef(null);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google || !stop?.location?.coordinates) return;

    const [lng, lat] = stop.location.coordinates;
    const position = { lat, lng };

    // Determine color based on stop type
    const color = isPickup ? "#10B981" : isDropoff ? "#EF4444" : "#3B82F6";
    const size = isPickup || isDropoff ? 10 : 8;

    // Create marker
    const marker = new window.google.maps.Marker({
      position,
      map,
      title: stop.name || "Stop",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: size,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    // Create info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; font-family: system-ui;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #171717;">
            ${stop.name || "Stop"}
          </div>
          ${
            stop.code
              ? `<div style="font-size: 12px; color: #666;">Code: ${stop.code}</div>`
              : ""
          }
          ${
            isPickup
              ? `<div style="font-size: 11px; color: #10B981; font-weight: 500; margin-top: 4px;">📍 Pickup Point</div>`
              : ""
          }
          ${
            isDropoff
              ? `<div style="font-size: 11px; color: #EF4444; font-weight: 500; margin-top: 4px;">🎯 Dropoff Point</div>`
              : ""
          }
        </div>
      `,
    });

    // Add click listener
    marker.addListener("click", () => {
      infoWindow.open(map, marker);
      if (onClick) onClick(stop);
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
  }, [map, stop, isPickup, isDropoff, onClick]);

  return null;
}
