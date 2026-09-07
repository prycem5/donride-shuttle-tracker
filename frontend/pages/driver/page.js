"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDriverAPI } from "@/hooks/useDriverAPI";
import { AlertCircle, Pause, Play, StopCircle } from "lucide-react";

export default function DriverConsolePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // State
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [isOnShift, setIsOnShift] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [lastSentTime, setLastSentTime] = useState(null);
  const [retryDelay, setRetryDelay] = useState(1000);
  const [isOnline, setIsOnline] = useState(true);

  const retryTimeoutRef = useRef(null);
  // Route background images mapping
  const routeBackgrounds = {
    "60d5ec49f1b2c72b8c8e4f3a": "/canterbury_blurred.jpg",
    "60d5ec49f1b2c72b8c8e4f4a": "/doermer_blurred.jpg",
    "60d5ec49f1b2c72b8c8e4f2a": "/housing_blurred.jpg",
  };
  const {
    routes,
    driverData,
    startShift,
    endShift,
    sendPing,
    isLoading: isApiLoading,
    isAuthenticated,
    isLoadingRoutes,
  } = useDriverAPI();

  // Handle location readings
  const handleLocationReading = useCallback(
    async (reading) => {
      if (!currentShift?.shuttleId) return;

      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      const ping = {
        shuttleId: currentShift.shuttleId,
        lat: reading.latitude,
        lng: reading.longitude,
        speed: reading.speed || 0,
        heading: reading.heading,
        accuracy: reading.accuracy,
        timestamp: new Date(reading.timestamp).toISOString(),
      };

      const success = await sendPing(ping);

      if (success) {
        setLastSentTime(new Date());
        setRetryDelay(1000);
      } else {
        const nextDelay = Math.min(retryDelay * 2, 30000);
        setRetryDelay(nextDelay);

        retryTimeoutRef.current = setTimeout(() => {
          handleLocationReading(reading);
        }, nextDelay);
      }
    },
    [currentShift, sendPing, retryDelay]
  );

  const {
    isWatching,
    lastReading,
    permission,
    error: geoError,
    startWatching,
    stopWatching,
  } = useGeolocation(handleLocationReading);

  // Check authentication and role
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
    const role = user?.publicMetadata?.role;
    console.log("User:", role);
    if (isLoaded && user) {
      if (role !== "driver") {
        router.push("/student");
        console.log(role);
      }
    }
  }, [user, isLoaded, router]);

  // Check if driver is already on a shift
  useEffect(() => {
    if (driverData) {
      if (driverData.currentRouteId && driverData.currentShuttleId) {
        setIsOnShift(true);
        setCurrentShift({
          routeId: driverData.currentRouteId,
          routeName: driverData.routeName,
          shuttleId: driverData.currentShuttleId,
          shuttleLabel: driverData.shuttleLabel,
        });
      }
    }
  }, [driverData]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Handlers
  const handleStartShift = async () => {
    if (!selectedRouteId) {
      toast.error("No route selected", {
        description: "Please select a route first",
      });
      return;
    }

    const shiftData = await startShift(selectedRouteId);

    if (shiftData) {
      setIsOnShift(true);
      setCurrentShift(shiftData);
      toast.success("Shift started", {
        description: `Driving ${shiftData.routeName} - ${shiftData.shuttleLabel}`,
      });
    }
  };

  const handleEndShift = async () => {
    // Stop GPS tracking first
    if (isWatching) {
      stopWatching();
    }

    const success = await endShift();

    if (success) {
      setIsOnShift(false);
      setCurrentShift(null);
      setSelectedRouteId("");
      toast.success("Shift ended", {
        description: "Your shift has been ended successfully",
      });
    }
  };

  const handleToggleTracking = () => {
    if (!isOnShift) {
      toast.error("Not on shift", {
        description: "Please start your shift first",
      });
      return;
    }

    if (isWatching) {
      stopWatching();
      toast.info("Location tracking paused");
    } else {
      startWatching();
      toast.success("Location tracking started");
    }
  };

  // Status helpers
  const getStatusBadge = () => {
    if (!isOnShift) {
      return (
        <Badge
          variant="secondary"
          className="rounded-full px-2.5 py-1 text-xs font-medium bg-neutral-100 text-neutral-700"
        >
          Off Shift
        </Badge>
      );
    }

    if (isWatching && permission === "granted") {
      return (
        <Badge className="bg-green-600 hover:bg-green-600 rounded-full px-2.5 py-1 text-xs font-medium">
          Tracking Active
        </Badge>
      );
    }
    if (isWatching && permission === "prompt") {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-500 rounded-full px-2.5 py-1 text-xs font-medium">
          Awaiting Permission
        </Badge>
      );
    }
    if (!isWatching) {
      return (
        <Badge
          variant="secondary"
          className="rounded-full px-2.5 py-1 text-xs font-medium bg-neutral-100 text-neutral-700"
        >
          Paused
        </Badge>
      );
    }
    if (permission === "denied" || geoError) {
      return (
        <Badge
          variant="destructive"
          className="rounded-full px-2.5 py-1 text-xs font-medium"
        >
          Location Error
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="rounded-full px-2.5 py-1 text-xs font-medium bg-neutral-100 text-neutral-700"
      >
        Paused
      </Badge>
    );
  };

  const showTroubleshooting =
    (permission === "denied" || geoError || !isOnline || !isAuthenticated) &&
    isOnShift;

  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-neutral-50" />;
  }

  return (
    <div
      className="min-h-screen pb-safe pb-24 lg:pb-8 transition-all duration-500 ease-out bg-neutral-50"
      style={{
        backgroundImage:
          selectedRouteId && routeBackgrounds[selectedRouteId]
            ? `url(${routeBackgrounds[selectedRouteId]})`
            : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-neutral-200/60 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight truncate">
                PFW Shuttle
              </h1>
              {driverData && (
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {driverData.name}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Shift Management */}
            <Card className="border border-neutral-200/60 shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg font-semibold text-neutral-900">
                  Shift Management
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-neutral-600 break-words">
                  {isOnShift
                    ? `Currently driving ${currentShift?.routeName}`
                    : "Select a route to start your shift"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                {!isOnShift ? (
                  <>
                    <div className="space-y-2.5">
                      <Label
                        htmlFor="route-select"
                        className="text-sm font-medium text-neutral-700"
                      >
                        Select Route
                      </Label>
                      <Select
                        value={selectedRouteId}
                        onValueChange={setSelectedRouteId}
                        disabled={isLoadingRoutes}
                      >
                        <SelectTrigger
                          id="route-select"
                          className="h-11 sm:h-12 border-neutral-300 bg-white text-sm sm:text-base focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-all"
                        >
                          <SelectValue
                            placeholder={
                              isLoadingRoutes
                                ? "Loading routes..."
                                : "Choose your route"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-2rem)]">
                          {routes.map((route) => (
                            <SelectItem
                              key={route._id}
                              value={route._id}
                              className="py-2.5 text-sm sm:text-base"
                            >
                              <div className="flex items-center gap-2 w-full min-w-0 max-w-full">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: route.color }}
                                />
                                <span className="font-medium truncate flex-1 min-w-0">
                                  {route.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleStartShift}
                      disabled={
                        !selectedRouteId || isApiLoading || !isAuthenticated
                      }
                      className="w-full h-11 sm:h-12 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white text-sm sm:text-base font-semibold transition-colors active:scale-[0.98]"
                    >
                      <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Start Shift
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs sm:text-sm font-medium text-neutral-500 flex-shrink-0">
                          Current Route
                        </span>
                        <span className="font-semibold text-neutral-900 text-sm sm:text-base text-right break-words">
                          {currentShift?.routeName}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs sm:text-sm font-medium text-neutral-500 flex-shrink-0">
                          Shuttle
                        </span>
                        <span className="font-semibold text-neutral-900 text-sm sm:text-base text-right break-words">
                          {currentShift?.shuttleLabel}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleEndShift}
                      disabled={isApiLoading}
                      variant="outline"
                      className="w-full h-11 sm:h-12 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 text-sm sm:text-base font-semibold transition-colors active:scale-[0.98]"
                    >
                      <StopCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      End Shift
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Location Tracking - Only visible when on shift */}
            {isOnShift && (
              <Card className="border border-neutral-200/60 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-neutral-900">
                    Location Tracking
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-neutral-600 break-words">
                    {isWatching
                      ? "Your location is being shared live"
                      : "Start tracking to share your location"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                  <Button
                    onClick={handleToggleTracking}
                    className={`w-full h-11 sm:h-12 text-sm sm:text-base font-semibold transition-colors active:scale-[0.98] ${
                      isWatching
                        ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white"
                        : "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                    }`}
                  >
                    {isWatching ? (
                      <>
                        <Pause className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Pause Tracking
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Start Tracking
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-neutral-500 text-center">
                    Updates every 5 seconds
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Status - Only visible when on shift */}
            {isOnShift && (
              <Card className="border border-neutral-200/60 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg font-semibold text-neutral-900">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge()}
                    {isWatching && permission === "granted" && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-700">
                          Live
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-neutral-200" />

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center gap-3 p-2.5 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-600 text-xs sm:text-sm">
                        Authentication
                      </span>
                      <span className="font-medium text-xs sm:text-sm flex-shrink-0">
                        {isAuthenticated ? (
                          <span className="text-green-700">✓ Active</span>
                        ) : (
                          <span className="text-red-700">✗ Inactive</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3 p-2.5 bg-neutral-50 rounded-lg">
                      <span className="text-neutral-600 text-xs sm:text-sm">
                        Last Update
                      </span>
                      <span className="font-medium text-neutral-900 text-xs sm:text-sm flex-shrink-0">
                        {lastSentTime ? lastSentTime.toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-neutral-50 rounded-lg">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <span className="text-neutral-600 text-xs">
                          Coordinates
                        </span>
                      </div>
                      <span className="font-mono text-xs text-neutral-700 break-all">
                        {lastReading
                          ? `${lastReading.latitude.toFixed(
                              6
                            )}, ${lastReading.longitude.toFixed(6)}`
                          : "Not available"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Troubleshooting */}
            {showTroubleshooting && (
              <Alert className="border border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-sm font-semibold text-red-900">
                  Having trouble?
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1.5 mt-2 text-xs sm:text-sm text-red-800">
                    {!isAuthenticated && (
                      <li>Authentication failed - please refresh</li>
                    )}
                    {permission === "denied" && (
                      <li>Enable location in browser settings</li>
                    )}
                    {geoError && <li>Check if GPS is enabled</li>}
                    {!isOnline && <li>You appear to be offline</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-4 sm:space-y-5">
            <Card className="border border-neutral-200/60 shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg font-semibold text-neutral-900">
                  Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-semibold mb-1 text-neutral-900 text-sm sm:text-base break-words">
                      Start Your Shift
                    </h3>
                    <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words">
                      Select your route from the dropdown and tap &quot;Start
                      Shift&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-semibold mb-1 text-neutral-900 text-sm sm:text-base break-words">
                      Enable Tracking
                    </h3>
                    <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words">
                      Tap &quot;Start Tracking&quot; and allow location access
                      when prompted.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-semibold mb-1 text-neutral-900 text-sm sm:text-base break-words">
                      Drive Your Route
                    </h3>
                    <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words">
                      Your location updates automatically. Students see you in
                      real-time.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-semibold mb-1 text-neutral-900 text-sm sm:text-base break-words">
                      Pause If Needed
                    </h3>
                    <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words">
                      Take breaks anytime. Resume tracking when you continue.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-semibold text-sm">
                    5
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-semibold mb-1 text-neutral-900 text-sm sm:text-base break-words">
                      End Your Shift
                    </h3>
                    <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words">
                      When done, tap &quot;End Shift&quot; to release the
                      shuttle.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOnShift && (
              <Card className="border border-neutral-800 shadow-sm bg-neutral-900 text-white overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <CardTitle className="text-base sm:text-lg font-semibold">
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 sm:px-6 pb-4 sm:pb-6 text-xs sm:text-sm text-neutral-300">
                  <p className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">
                      Keep your phone charged during your shift
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">
                      Ensure location services stay enabled
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">
                      Pause and resume if tracking stops
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">
                      Keep this tab open while driving
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span className="break-words">
                      Contact support for technical issues
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar (Mobile Only) */}
      {isOnShift && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-neutral-200 safe-bottom lg:hidden z-50">
          <div className="w-full max-w-7xl mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-500 font-medium mb-0.5">
                  Active Route
                </div>
                <div className="font-semibold text-neutral-900 text-sm truncate">
                  {currentShift?.routeName}
                </div>
                <div className="text-xs text-neutral-600 truncate">
                  {currentShift?.shuttleLabel}
                </div>
              </div>
              <Button
                onClick={handleToggleTracking}
                size="lg"
                className={`h-12 px-5 font-semibold transition-colors active:scale-95 flex-shrink-0 ${
                  isWatching
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isWatching ? (
                  <>
                    <Pause className="mr-1.5 h-4 w-4" />
                    <span className="hidden xs:inline">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-4 w-4" />
                    <span className="hidden xs:inline">Track</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
