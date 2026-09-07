// lib/store/bookingStore.js
"use client";

import { create } from "zustand";

export const useBookingStore = create((set, get) => ({
  pickupStop: null,
  dropoffStop: null,
  selectedShuttle: null,
  availableShuttles: [],
  isLoading: false,
  error: "",

  setPickupStop: (stop) => set({ pickupStop: stop }),
  setDropoffStop: (stop) => set({ dropoffStop: stop }),
  setSelectedShuttle: (shuttle) => set({ selectedShuttle: shuttle }),

  setAvailableShuttles: (shuttles) => set({ availableShuttles: shuttles }),
  setIsLoading: (v) => set({ isLoading: v }),
  setError: (msg) => set({ error: msg }),

  resetBooking: () =>
    set({
      pickupStop: null,
      dropoffStop: null,
      selectedShuttle: null,
      availableShuttles: [],
      isLoading: false,
      error: "",
    }),
}));
