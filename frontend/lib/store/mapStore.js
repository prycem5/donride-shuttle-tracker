// lib/store/mapStore.js
"use client";

import { create } from "zustand";

const DEFAULT_CENTER = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT) || 41.1181,
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG) || -85.1093,
};
const DEFAULT_ZOOM = Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM) || 14;

export const useMapStore = create((set, get) => ({
  userLocation: null, // {lat,lng} or null
  mapCenter: DEFAULT_CENTER,
  mapZoom: DEFAULT_ZOOM,
  activeShuttles: [],
  stops: [],

  setUserLocation: (coords) => set({ userLocation: coords }),
  setMapCenter: (coords) => set({ mapCenter: coords }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  setActiveShuttles: (list) =>
    set({ activeShuttles: Array.isArray(list) ? list : [] }),
  setStops: (list) => set({ stops: Array.isArray(list) ? list : [] }),

  updateShuttlePosition: (shuttleId, lat, lng, extra = {}) =>
    set((state) => ({
      activeShuttles: state.activeShuttles.map((s) =>
        (s._id || s.id) === shuttleId ? { ...s, lat, lng, ...extra } : s
      ),
    })),
}));
