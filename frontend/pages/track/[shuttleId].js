// app/track/[shuttleId]/page.jsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useStudentAPI } from "@/hooks/useStudentAPI";
import { useShuttlePosition } from "@/lib/realtime/hooks";
import { BottomSheet } from "@/components/ui/BottomSheet";

// Lazy load Google Maps components
const GoogleMapView = dynamic(() => import("@/components/map/GoogleMapView"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
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

// Tracking states
const TRACK_STATES = {
  WAITING: "waiting", // Shuttle approaching pickup
  BOARDING: "boarding", // At pickup stop
  EN_ROUTE: "en_route", // Between pickup and dropoff
  ARRIVING: "arriving", // Near dropoff
  ARRIVED: "arrived", // At dropoff
};

export default function TrackShuttlePage() {
  const router = useRouter();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // router.query contains both dynamic params and query string
  const {
    shuttleId: rawShuttleId,
    pickup: rawPickup,
    dropoff: rawDropoff,
  } = router.query;

  // Normalize values (can be string | string[] | undefined)
  const shuttleId = useMemo(() => {
    if (!rawShuttleId) return "";
    const value = Array.isArray(rawShuttleId) ? rawShuttleId[0] : rawShuttleId;
    return decodeURIComponent(value);
  }, [rawShuttleId]);

  const pickupId = useMemo(() => {
    if (!rawPickup) return null;
    return Array.isArray(rawPickup) ? rawPickup[0] : rawPickup;
  }, [rawPickup]);

  const dropoffId = useMemo(() => {
    if (!rawDropoff) return null;
    return Array.isArray(rawDropoff) ? rawDropoff[0] : rawDropoff;
  }, [rawDropoff]);

  const { stops, routes, liveShuttles, getShuttleArrivals } = useStudentAPI();

  // Live GPS via Ably
  const livePosition = useShuttlePosition(shuttleId);

  // Local state
  const [shuttle, setShuttle] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [trackState, setTrackState] = useState(TRACK_STATES.WAITING);
  const [etaToPickup, setEtaToPickup] = useState(null);
  const [etaToDropoff, setEtaToDropoff] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Find shuttle from live shuttles or fetch
  useEffect(() => {
    const found = liveShuttles.find((s) => (s._id || s.id) === shuttleId);
    if (found) {
      setShuttle(found);
      return;
    }

    // Fetch if not in live list
    if (!apiBaseUrl || !shuttleId) return;

    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/shuttles/live`, {
          cache: "no-store",
        });
        const json = await res.json();
        const list = json?.data || [];
        const match = list.find((s) => (s._id || s.id) === shuttleId);
        if (match) setShuttle(match);
      } catch (e) {
        console.error("Failed to fetch shuttle:", e);
      }
    })();
  }, [liveShuttles, shuttleId, apiBaseUrl]);

  // Get stops
  const pickupStop = useMemo(
    () => (pickupId ? stops.find((s) => (s._id || s.id) === pickupId) : null),
    [stops, pickupId]
  );
  const dropoffStop = useMemo(
    () => (dropoffId ? stops.find((s) => (s._id || s.id) === dropoffId) : null),
    [stops, dropoffId]
  );

  // Get route info
  const shuttleRoute = useMemo(() => {
    const routeId =
      shuttle?.routeId?._id || shuttle?.routeId?.id || shuttle?.routeId;
    if (!routeId) return null;
    return routes.find((r) => (r._id || r.id) === routeId) || shuttle?.routeId;
  }, [shuttle, routes]);

  const routeColor =
    shuttle?.routeId?.color || shuttle?.route?.color || "#3B82F6";
  const routeName = shuttle?.routeId?.name || shuttle?.route?.name || "Shuttle";

  // Compute shuttle position for map
  const shuttlePosition = useMemo(() => {
    if (livePosition?.lat && livePosition?.lng) {
      return { lat: Number(livePosition.lat), lng: Number(livePosition.lng) };
    }
    if (shuttle?.currentLocation?.coordinates) {
      const [lng, lat] = shuttle.currentLocation.coordinates;
      return { lat, lng };
    }
    if (shuttle?.ping?.lat && shuttle?.ping?.lng) {
      return { lat: shuttle.ping.lat, lng: shuttle.ping.lng };
    }
    return null;
  }, [livePosition, shuttle]);

  // Map center - follow shuttle
  const mapCenter = useMemo(() => {
    if (shuttlePosition) {
      return [shuttlePosition.lat, shuttlePosition.lng];
    }
    if (pickupStop?.location?.coordinates) {
      const [lng, lat] = pickupStop.location.coordinates;
      return [lat, lng];
    }
    return [
      Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT) || 41.1181,
      Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG) || -85.1093,
    ];
  }, [shuttlePosition, pickupStop]);

  // Build shuttle object for marker
  const shuttleForMarker = useMemo(() => {
    if (!shuttlePosition) return null;
    return {
      _id: shuttleId,
      label: shuttle?.label,
      routeId: shuttle?.routeId,
      route: shuttle?.route,
      heading: livePosition?.heading,
      ping: {
        lat: shuttlePosition.lat,
        lng: shuttlePosition.lng,
        heading: livePosition?.heading,
      },
    };
  }, [shuttleId, shuttle, shuttlePosition, livePosition]);

  // Poll arrivals every 10s
  useEffect(() => {
    if (!shuttleId) return;

    const poll = async () => {
      try {
        const arr = await getShuttleArrivals(shuttleId);
        setArrivals(arr || []);

        // Calculate ETAs to pickup and dropoff
        if (pickupId) {
          const pickupArrival = arr?.find(
            (a) => (a?.stop?.id || a?.stop?._id || a?.stopId) === pickupId
          );
          setEtaToPickup(pickupArrival?.etaSeconds ?? null);
        }
        if (dropoffId) {
          const dropoffArrival = arr?.find(
            (a) => (a?.stop?.id || a?.stop?._id || a?.stopId) === dropoffId
          );
          setEtaToDropoff(dropoffArrival?.etaSeconds ?? null);
        }
      } catch (e) {
        console.error("Failed to poll arrivals:", e);
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [shuttleId, pickupId, dropoffId, getShuttleArrivals]);

  // Determine tracking state based on ETAs
  useEffect(() => {
    if (etaToPickup !== null && etaToPickup > 60) {
      setTrackState(TRACK_STATES.WAITING);
    } else if (etaToPickup !== null && etaToPickup <= 60) {
      setTrackState(TRACK_STATES.BOARDING);
    } else if (etaToDropoff !== null && etaToDropoff > 120) {
      setTrackState(TRACK_STATES.EN_ROUTE);
    } else if (etaToDropoff !== null && etaToDropoff <= 120) {
      setTrackState(TRACK_STATES.ARRIVING);
    }
  }, [etaToPickup, etaToDropoff]);

  // Status message based on state
  const statusMessage = useMemo(() => {
    switch (trackState) {
      case TRACK_STATES.WAITING:
        return "Shuttle is on the way";
      case TRACK_STATES.BOARDING:
        return "Shuttle arriving now!";
      case TRACK_STATES.EN_ROUTE:
        return "You're on board";
      case TRACK_STATES.ARRIVING:
        return "Almost there!";
      case TRACK_STATES.ARRIVED:
        return "You've arrived";
      default:
        return "Tracking shuttle...";
    }
  }, [trackState]);

  // Format ETA for display
  const formatEta = (seconds) => {
    if (seconds === null || seconds === undefined) return null;
    if (seconds < 60) return "< 1 min";
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  // Format ETA countdown style
  const formatEtaLarge = (seconds) => {
    if (seconds === null || seconds === undefined) return "--";
    const mins = Math.floor(seconds / 60);
    return mins.toString();
  };

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-gray-100">
      {/* Back Button - Floating */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
      >
        <svg
          className="w-5 h-5 text-gray-700"
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

      {/* Live Indicator - Floating */}
      {livePosition && (
        <div className="absolute top-4 right-4 z-50">
          <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      )}

      {/* Full Screen Map */}
      <div className="absolute inset-0">
        <GoogleMapView center={mapCenter} zoom={16} className="w-full h-full">
          {(map) => (
            <>
              {/* Draw all routes using GoogleMultiRoute to avoid conflicts */}
              <GoogleMultiRoute
                map={map}
                routes={[
                  // Main route: pickup to dropoff (blue)
                  ...(pickupStop && dropoffStop
                    ? [
                        {
                          origin: pickupStop,
                          destination: dropoffStop,
                          color: routeColor,
                        },
                      ]
                    : []),
                  // Shuttle approach: shuttle to pickup (green) - only when waiting
                  ...(shuttlePosition &&
                  pickupStop &&
                  trackState === TRACK_STATES.WAITING
                    ? [
                        {
                          origin: {
                            lat: shuttlePosition.lat,
                            lng: shuttlePosition.lng,
                          },
                          destination: pickupStop,
                          color: "#10B981",
                        },
                      ]
                    : []),
                ]}
                onRouteCalculated={(info) => setRouteInfo(info)}
              />

              {/* Pickup Stop */}
              {pickupStop && (
                <GoogleStopMarker map={map} stop={pickupStop} isPickup={true} />
              )}

              {/* Dropoff Stop */}
              {dropoffStop && (
                <GoogleStopMarker
                  map={map}
                  stop={dropoffStop}
                  isDropoff={true}
                />
              )}

              {/* User Location */}
              <GoogleUserLocationMarker map={map} />

              {/* The Shuttle */}
              {shuttleForMarker && (
                <GoogleShuttleMarker
                  map={map}
                  shuttle={shuttleForMarker}
                  color={routeColor}
                />
              )}
            </>
          )}
        </GoogleMapView>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet snapPoints={[0.32, 0.55, 0.85]} defaultSnapIndex={0}>
        {({ snapTo }) => (
          <div className="px-4 pb-8">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500 font-medium">
                  {statusMessage}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: routeColor }}
                  />
                  <span className="font-semibold text-gray-900">
                    {shuttle?.label || "Shuttle"}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 text-sm">{routeName}</span>
                </div>
              </div>

              {/* Big ETA Display */}
              {etaToPickup !== null && trackState === TRACK_STATES.WAITING && (
                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-900">
                    {formatEtaLarge(etaToPickup)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    min away
                  </div>
                </div>
              )}
              {etaToDropoff !== null && trackState !== TRACK_STATES.WAITING && (
                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-900">
                    {formatEtaLarge(etaToDropoff)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    min to arrive
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                {/* Pickup */}
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      trackState !== TRACK_STATES.WAITING
                        ? "bg-green-500 border-green-500"
                        : "border-green-500 bg-white"
                    }`}
                  >
                    {trackState !== TRACK_STATES.WAITING && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Pickup</div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {pickupStop?.name || "Loading..."}
                    </div>
                  </div>
                </div>

                {/* Progress Line */}
                <div className="flex-1 h-0.5 bg-gray-200 relative mx-2">
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
                    style={{
                      width:
                        trackState === TRACK_STATES.WAITING
                          ? "0%"
                          : trackState === TRACK_STATES.BOARDING
                          ? "20%"
                          : trackState === TRACK_STATES.EN_ROUTE
                          ? "60%"
                          : trackState === TRACK_STATES.ARRIVING
                          ? "90%"
                          : "100%",
                    }}
                  />
                </div>

                {/* Dropoff */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <div className="flex-1 text-right">
                    <div className="text-xs text-gray-500">Dropoff</div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {dropoffStop?.name || "Loading..."}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      trackState === TRACK_STATES.ARRIVED
                        ? "bg-red-500 border-red-500"
                        : "border-red-500 bg-white"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Trip Details Card */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700">
                  Trip Details
                </div>
                {routeInfo && (
                  <div className="text-xs text-gray-500">
                    {routeInfo.distance} • {routeInfo.duration}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="w-0.5 h-8 bg-gray-300" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="text-xs text-gray-500">Pickup</div>
                    <div className="font-medium text-gray-900">
                      {pickupStop?.name || "—"}
                    </div>
                    {etaToPickup !== null &&
                      trackState === TRACK_STATES.WAITING && (
                        <div className="text-sm text-green-600 font-medium mt-0.5">
                          {formatEta(etaToPickup)} away
                        </div>
                      )}
                    {trackState === TRACK_STATES.BOARDING && (
                      <div className="text-sm text-green-600 font-medium mt-0.5">
                        Arriving now!
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Dropoff</div>
                    <div className="font-medium text-gray-900">
                      {dropoffStop?.name || "—"}
                    </div>
                    {etaToDropoff !== null && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        Est. {formatEta(etaToDropoff)} total
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Stops */}
            {arrivals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700">
                    Upcoming Stops
                  </div>
                  <div className="text-xs text-gray-400">Live updates</div>
                </div>
                <div className="space-y-2">
                  {arrivals.slice(0, 4).map((arrival, idx) => {
                    const stopName =
                      arrival?.stop?.name || arrival?.stopName || "Stop";
                    const eta = arrival?.etaSeconds;
                    const isPickup =
                      (arrival?.stop?._id ||
                        arrival?.stop?.id ||
                        arrival?.stopId) === pickupId;
                    const isDropoff =
                      (arrival?.stop?._id ||
                        arrival?.stop?.id ||
                        arrival?.stopId) === dropoffId;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl ${
                          isPickup
                            ? "bg-green-50 border border-green-200"
                            : isDropoff
                            ? "bg-red-50 border border-red-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isPickup && (
                            <span className="text-green-600 text-xs font-medium">
                              PICKUP
                            </span>
                          )}
                          {isDropoff && (
                            <span className="text-red-600 text-xs font-medium">
                              DROPOFF
                            </span>
                          )}
                          {!isPickup && !isDropoff && (
                            <span className="w-2 h-2 bg-gray-400 rounded-full" />
                          )}
                          <span
                            className={`text-sm ${
                              isPickup || isDropoff ? "font-medium" : ""
                            }`}
                          >
                            {stopName}
                          </span>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            isPickup
                              ? "text-green-600"
                              : isDropoff
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {formatEta(eta) || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No arrivals state */}
            {arrivals.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <div className="text-3xl mb-2">🚌</div>
                <div className="text-sm">Waiting for shuttle data...</div>
              </div>
            )}

            {/* Cancel/Done Button */}
            <div className="mt-6">
              <button
                onClick={() => router.push("/student/page")}
                className="w-full py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
                Done Tracking
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
