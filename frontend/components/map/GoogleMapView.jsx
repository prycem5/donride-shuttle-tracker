// components/map/GoogleMapView.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * GoogleMapView component - PROPERLY FIXED VERSION
 * Fixes: 1) Children rendering, 2) Multiple script loading
 */
export default function GoogleMapView({ center, zoom, className, children }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Default values
  const defaultLat =
    Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT) || 41.1181;
  const defaultLng =
    Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG) || -85.1093;
  const defaultZoom =
    Number(zoom ?? process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM) || 14;

  const mapCenter =
    Array.isArray(center) && center.length === 2
      ? { lat: center[0], lng: center[1] }
      : { lat: defaultLat, lng: defaultLng };

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError(
        "Google Maps API key not found. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local"
      );
      return;
    }

    if (!mapRef.current) return;

    let mounted = true;

    // FIX #2: Check if script already exists to prevent multiple loading
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (window.google?.maps) {
      // Google Maps already loaded
      initializeMap();
      return;
    }

    if (existingScript) {
      // Script is loading but not ready yet, wait for it
      existingScript.addEventListener("load", () => {
        if (mounted && window.google?.maps) {
          initializeMap();
        }
      });
      return;
    }

    // Load Google Maps script (only if not already present)
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (mounted && window.google?.maps) {
        initializeMap();
      }
    };

    script.onerror = () => {
      if (mounted) {
        setError("Failed to load Google Maps script");
      }
    };

    document.head.appendChild(script);

    function initializeMap() {
      if (!mapRef.current || !window.google?.maps) return;

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: defaultZoom,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;
        setIsLoaded(true);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError(err.message || "Failed to initialize map");
      }
    }

    return () => {
      mounted = false;
    };
  }, [mapCenter.lat, mapCenter.lng, defaultZoom]); // Added dependencies

  // Update map center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      mapInstanceRef.current.setCenter(mapCenter);
    }
  }, [mapCenter.lat, mapCenter.lng, isLoaded]);

  // Update zoom when it changes
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      mapInstanceRef.current.setZoom(defaultZoom);
    }
  }, [defaultZoom, isLoaded]);

  if (error) {
    return (
      <div
        className={clsx(
          "relative w-full flex items-center justify-center bg-red-50",
          className
        )}
      >
        <div className="text-red-600 text-center p-4">
          <p className="font-semibold">Failed to load Google Maps</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx("relative w-full", className)}
      style={{ minHeight: 320 }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: "100%" }}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-600 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* FIX #1: Properly render children based on type */}
      {isLoaded && children && (
        <>
          {typeof children === "function"
            ? children(mapInstanceRef.current)
            : children}
        </>
      )}
    </div>
  );
}
