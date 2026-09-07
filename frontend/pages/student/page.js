// app/student/page.jsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useStudentAPI } from "@/hooks/useStudentAPI";
import { UserButton, useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

// Lazy load Google Maps components
const GoogleMapView = dynamic(() => import("@/components/map/GoogleMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  ),
});
const GoogleStopMarker = dynamic(
  () => import("@/components/map/GoogleStopMarker"),
  { ssr: false }
);
const GoogleShuttleMarker = dynamic(
  () => import("@/components/map/GoogleShuttleMarker"),
  { ssr: false }
);
const GoogleUserLocationMarker = dynamic(
  () => import("@/components/map/GoogleUserLocationMarker"),
  { ssr: false }
);
const GoogleDirections = dynamic(
  () => import("@/components/map/GoogleDirections"),
  { ssr: false }
);
const GoogleMultiRoute = dynamic(
  () => import("@/components/map/GoogleMultiRoute"),
  { ssr: false }
);

// View states for the bottom sheet
const VIEW_STATES = {
  HOME: "home",
  SELECT_STOPS: "select_stops",
  RESULTS: "results",
};

export default function StudentPage() {
  const { user } = useUser();
  const {
    stops,
    routes,
    liveShuttles,
    availableShuttles,
    loadingAny,
    liveShuttlesLoading,
    isFinding,
    findError,
    findShuttlesByStops,
  } = useStudentAPI();

  // UI State
  const [view, setView] = useState(VIEW_STATES.HOME);
  const [pickupId, setPickupId] = useState("");
  const [dropoffId, setDropoffId] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);

  // Derived state
  const pickupStop = useMemo(
    () => stops.find((s) => (s._id || s.id) === pickupId),
    [stops, pickupId]
  );
  const dropoffStop = useMemo(
    () => stops.find((s) => (s._id || s.id) === dropoffId),
    [stops, dropoffId]
  );

  const canSearch = pickupId && dropoffId && pickupId !== dropoffId;

  // Map center - follow selection or default to campus
  const mapCenter = useMemo(() => {
    if (pickupStop?.location?.coordinates) {
      const [lng, lat] = pickupStop.location.coordinates;
      return [lat, lng];
    }
    return [
      Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT) || 41.1181,
      Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG) || -85.1093,
    ];
  }, [pickupStop]);

  // Handle stop selection from map marker click
  const handleStopClick = useCallback(
    (stop) => {
      const stopId = stop._id || stop.id;
      if (!pickupId) {
        setPickupId(stopId);
        setView(VIEW_STATES.SELECT_STOPS);
      } else if (!dropoffId && stopId !== pickupId) {
        setDropoffId(stopId);
      }
    },
    [pickupId, dropoffId]
  );

  // Search for shuttles
  const handleSearch = async () => {
    if (!canSearch) return;
    await findShuttlesByStops(pickupId, dropoffId);
    setView(VIEW_STATES.RESULTS);
  };

  // Reset to home
  const handleReset = () => {
    setPickupId("");
    setDropoffId("");
    setView(VIEW_STATES.HOME);
    setRouteInfo(null);
  };

  // Snap point changes based on view
  const getSnapPoints = () => {
    switch (view) {
      case VIEW_STATES.HOME:
        return [0.18, 0.5, 0.85];
      case VIEW_STATES.SELECT_STOPS:
        return [0.35, 0.6, 0.85];
      case VIEW_STATES.RESULTS:
        return [0.35, 0.65, 0.9];
      default:
        return [0.18, 0.5, 0.85];
    }
  };

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-gray-100">
      {/* Floating Header */}
      <header className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
        <div className="flex items-center justify-between p-4">
          {/* Logo/Title */}
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <h1 className="text-sm font-semibold text-gray-900">PFW Shuttle</h1>
          </div>

          {/* User Button */}
          <div className="pointer-events-auto">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 shadow-lg",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Live Shuttles Count Badge */}
      {liveShuttles.length > 0 && view === VIEW_STATES.HOME && (
        <div className="absolute top-20 left-4 z-40">
          <div className="bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {liveShuttles.length} shuttle{liveShuttles.length !== 1 ? "s" : ""}{" "}
            active
          </div>
        </div>
      )}

      {/* Full Screen Map */}
      <div className="absolute inset-0">
        <GoogleMapView center={mapCenter} zoom={15} className="w-full h-full">
          {(map) => (
            <>
              {/* A→B Directions when both stops selected */}
              {pickupStop && dropoffStop && (
                <GoogleMultiRoute
                  map={map}
                  routes={[
                    {
                      origin: pickupStop,
                      destination: dropoffStop,
                      color: "#3B82F6",
                    },
                  ]}
                  onRouteCalculated={setRouteInfo}
                />
              )}

              {/* All Stops */}
              {stops.map((stop) => (
                <GoogleStopMarker
                  key={stop._id || stop.id}
                  map={map}
                  stop={stop}
                  isPickup={(stop._id || stop.id) === pickupId}
                  isDropoff={(stop._id || stop.id) === dropoffId}
                  onClick={() => handleStopClick(stop)}
                />
              ))}

              {/* User Location */}
              <GoogleUserLocationMarker map={map} />

              {/* Live Shuttles - always visible */}
              {liveShuttles.map((shuttle) => {
                const color =
                  shuttle.routeId?.color || shuttle.route?.color || "#2563EB";
                return (
                  <GoogleShuttleMarker
                    key={shuttle._id || shuttle.id}
                    map={map}
                    shuttle={shuttle}
                    color={color}
                  />
                );
              })}
            </>
          )}
        </GoogleMapView>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet snapPoints={getSnapPoints()} defaultSnapIndex={0}>
        {({ snapTo, isExpanded }) => (
          <div className="px-4 pb-8">
            {/* HOME VIEW */}
            {view === VIEW_STATES.HOME && (
              <>
                {/* Search Bar */}
                <button
                  onClick={() => {
                    setView(VIEW_STATES.SELECT_STOPS);
                    snapTo(1);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 bg-gray-100 rounded-2xl text-left hover:bg-gray-200 active:scale-[0.98] transition-all mb-4"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-gray-900 font-medium">
                      Where do you want to go?
                    </div>
                    <div className="text-gray-500 text-sm">
                      Tap to select pickup & dropoff
                    </div>
                  </div>
                </button>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {liveShuttles.length}
                    </div>
                    <div className="text-sm text-gray-500">Active Shuttles</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {stops.length}
                    </div>
                    <div className="text-sm text-gray-500">Stops Available</div>
                  </div>
                </div>

                {/* Active Shuttles Preview */}
                {liveShuttles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      ACTIVE NOW
                    </h3>
                    <div className="space-y-2">
                      {liveShuttles.slice(0, 3).map((shuttle) => (
                        <div
                          key={shuttle._id || shuttle.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                shuttle.routeId?.color ||
                                shuttle.route?.color ||
                                "#3B82F6",
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {shuttle.label || "Shuttle"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {shuttle.routeId?.name ||
                                shuttle.route?.name ||
                                "On Route"}
                            </div>
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            Live
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {liveShuttles.length === 0 && !liveShuttlesLoading && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🚌</div>
                    <div className="text-sm">No shuttles active right now</div>
                  </div>
                )}
              </>
            )}

            {/* SELECT STOPS VIEW */}
            {view === VIEW_STATES.SELECT_STOPS && (
              <>
                {/* Back button */}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="text-sm font-medium">Back</span>
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Select your stops
                </h2>

                {/* Stop Selection */}
                <div className="space-y-3 mb-4">
                  {/* Pickup */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <span className="w-3 h-3 bg-green-500 rounded-full" />
                      Pickup
                    </label>
                    <select
                      value={pickupId}
                      onChange={(e) => setPickupId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">
                        {loadingAny ? "Loading..." : "Select pickup stop..."}
                      </option>
                      {stops.map((stop) => (
                        <option
                          key={stop._id || stop.id}
                          value={stop._id || stop.id}
                        >
                          {stop.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Connector */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gray-200" />
                  </div>

                  {/* Dropoff */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <span className="w-3 h-3 bg-red-500 rounded-full" />
                      Dropoff
                    </label>
                    <select
                      value={dropoffId}
                      onChange={(e) => setDropoffId(e.target.value)}
                      disabled={!pickupId}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {!pickupId
                          ? "Select pickup first..."
                          : "Select dropoff stop..."}
                      </option>
                      {stops
                        .filter((s) => (s._id || s.id) !== pickupId)
                        .map((stop) => (
                          <option
                            key={stop._id || stop.id}
                            value={stop._id || stop.id}
                          >
                            {stop.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Route Info Preview */}
                {routeInfo && (
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl mb-4">
                    <div className="flex-1">
                      <div className="text-sm text-blue-600 font-medium">
                        {routeInfo.distance}
                      </div>
                      <div className="text-xs text-blue-500">
                        ~{routeInfo.duration} by shuttle
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={!canSearch || isFinding}
                  className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  {isFinding ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Finding shuttles...
                    </span>
                  ) : (
                    "Find Shuttles"
                  )}
                </button>

                {/* Tip */}
                <p className="text-xs text-gray-400 text-center mt-3">
                  Tip: You can also tap stops on the map
                </p>
              </>
            )}

            {/* RESULTS VIEW */}
            {view === VIEW_STATES.RESULTS && (
              <>
                {/* Header with route summary */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setView(VIEW_STATES.SELECT_STOPS)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>

                {/* Route Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <div className="w-0.5 h-8 bg-gray-300 my-1" />
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {pickupStop?.name || "Pickup"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 mb-2">
                        {routeInfo
                          ? `${routeInfo.distance} • ${routeInfo.duration}`
                          : "Calculating..."}
                      </div>
                      <div className="font-medium text-gray-900">
                        {dropoffStop?.name || "Dropoff"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results */}
                {findError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">
                    {findError}
                  </div>
                )}

                {availableShuttles.length === 0 && !isFinding && !findError && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">😕</div>
                    <div className="text-gray-600 font-medium">
                      No shuttles available
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Try again in a few minutes
                    </div>
                  </div>
                )}

                {availableShuttles.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      {availableShuttles.length} SHUTTLE
                      {availableShuttles.length !== 1 ? "S" : ""} AVAILABLE
                    </h3>

                    <div className="space-y-3">
                      {availableShuttles.map((shuttle) => {
                        const id = shuttle._id || shuttle.id;
                        const label =
                          shuttle.label || `Shuttle ${id?.slice(-4)}`;
                        const routeName =
                          shuttle.routeId?.name ||
                          shuttle.route?.name ||
                          "Route";
                        const routeColor =
                          shuttle.routeId?.color ||
                          shuttle.route?.color ||
                          "#3B82F6";
                        const etaPickup =
                          shuttle.etaToPickup ?? shuttle.eta_to_pickup ?? null;
                        const etaDrop =
                          shuttle.etaToDropoff ??
                          shuttle.eta_to_dropoff ??
                          null;

                        return (
                          <div
                            key={id}
                            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                                  style={{ backgroundColor: routeColor }}
                                >
                                  🚐
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {label}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {routeName}
                                  </div>
                                </div>
                              </div>
                              {etaPickup != null && (
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {formatEta(etaPickup)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    to pickup
                                  </div>
                                </div>
                              )}
                            </div>

                            {etaDrop != null && (
                              <div className="text-sm text-gray-500 mb-3">
                                Total trip time:{" "}
                                <span className="font-medium text-gray-700">
                                  {formatEta(etaDrop)}
                                </span>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  window.location.assign(
                                    `/track/${encodeURIComponent(
                                      id
                                    )}?pickup=${encodeURIComponent(
                                      pickupId
                                    )}&dropoff=${encodeURIComponent(dropoffId)}`
                                  )
                                }
                                className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                              >
                                Track
                              </button>
                             
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function formatEta(seconds) {
  if (typeof seconds !== "number") return "—";
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}
