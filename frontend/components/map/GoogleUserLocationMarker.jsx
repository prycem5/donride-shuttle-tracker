// components/map/GoogleUserLocationMarker.jsx
"use client";

import { useEffect, useRef } from "react";

/**
 * UserLocationMarker for Google Maps
 * Shows user's current location with a blue dot
 */
export default function GoogleUserLocationMarker({ map }) {
  const markerRef = useRef(null);
  const watchIdRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!markerRef.current) {
          // Create accuracy circle
          circleRef.current = new window.google.maps.Circle({
            strokeColor: "#4285F4",
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: "#4285F4",
            fillOpacity: 0.1,
            map,
            center: pos,
            radius: position.coords.accuracy,
          });

          // Create user marker
          markerRef.current = new window.google.maps.Marker({
            position: pos,
            map,
            title: "Your Location",
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            zIndex: 999, // Below shuttles but above stops
          });

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 6px; font-family: system-ui;">
                <div style="font-weight: 600; color: #171717; font-size: 13px;">
                  📍 Your Location
                </div>
                <div style="font-size: 11px; color: #888; margin-top: 2px;">
                  Accuracy: ~${Math.round(position.coords.accuracy)}m
                </div>
              </div>
            `,
          });

          markerRef.current.addListener("click", () => {
            infoWindow.open(map, markerRef.current);
          });
        } else {
          // Update position
          markerRef.current.setPosition(pos);
          if (circleRef.current) {
            circleRef.current.setCenter(pos);
            circleRef.current.setRadius(position.coords.accuracy);
          }
        }
      },
      (error) => {
        console.warn("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map]);

  return null;
}
