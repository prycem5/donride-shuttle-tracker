import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useState, useEffect } from "react";

/**
 * Custom hook for driver API integration
 * Handles JWT token authentication, route fetching, shift management, and GPS pings
 */
export function useDriverAPI() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [jwtToken, setJwtToken] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [lastError, setLastError] = useState(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Get JWT token and driver data on mount
  useEffect(() => {
    const getDriverToken = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/driver-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clerkUserId: userId,
          }),
        });

        console.log("1:", response);

        // Don't throw error immediately - check the response first
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Driver login failed:", response.status, errorData);
          setLastError(
            `Failed to authenticate: ${
              errorData.message || response.statusText
            }`
          );
          return; // Exit gracefully, don't throw
        }

        const result = await response.json();
        console.log("2: Result data:", result);

        if (result.success && result.data) {
          setJwtToken(result.data.token);
          setDriverData(result.data.driver);
          console.log("✅ Driver authenticated successfully");
        } else {
          console.error("Invalid response format:", result);
          setLastError("Invalid response from server");
        }
      } catch (error) {
        console.error("Error getting driver token:", error);
        setLastError("Failed to authenticate as driver");
      }
    };

    getDriverToken();
  }, [userId, apiBaseUrl]);

  // Fetch available routes
  useEffect(() => {
    const fetchRoutes = async () => {
      setIsLoadingRoutes(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/routes`);

        if (!response.ok) {
          throw new Error("Failed to fetch routes");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setRoutes(result.data);
        }
      } catch (error) {
        console.error("Error fetching routes:", error);
        setLastError("Failed to load routes");
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    if (apiBaseUrl) {
      fetchRoutes();
    }
  }, [apiBaseUrl]);

  /**
   * Start driver shift with selected route
   * @param {string} routeId - MongoDB ObjectId of the route
   * @returns {Promise<Object|null>} Shift data if successful
   */
  const startShift = useCallback(
    async (routeId) => {
      if (!jwtToken) {
        setLastError("Not authenticated");
        return null;
      }

      setIsLoading(true);
      setLastError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/driver/start-shift`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ routeId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to start shift");
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Update driver data with new shift info
          setDriverData((prev) => ({
            ...prev,
            currentRouteId: result.data.routeId,
            currentShuttleId: result.data.shuttleId,
            routeName: result.data.routeName,
            shuttleLabel: result.data.shuttleLabel,
            status: "onroute",
          }));

          setIsLoading(false);
          return result.data;
        }

        setIsLoading(false);
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to start shift";
        setLastError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [jwtToken, apiBaseUrl]
  );

  /**
   * End driver shift
   * @returns {Promise<boolean>} True if successful
   */
  const endShift = useCallback(async () => {
    if (!jwtToken) {
      setLastError("Not authenticated");
      return false;
    }

    setIsLoading(true);
    setLastError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/driver/end-shift`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to end shift");
      }

      // Update driver data - clear shift info
      setDriverData((prev) => ({
        ...prev,
        currentRouteId: null,
        currentShuttleId: null,
        routeName: null,
        shuttleLabel: null,
        status: "idle",
      }));

      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to end shift";
      setLastError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [jwtToken, apiBaseUrl]);

  /**
   * Send a GPS ping to the backend
   * @param {Object} ping - GPS ping data
   * @param {string} ping.shuttleId - MongoDB ObjectId of the shuttle
   * @param {number} ping.lat - Latitude
   * @param {number} ping.lng - Longitude
   * @param {number} ping.speed - Speed in km/h
   * @param {number} ping.heading - Heading in degrees (optional)
   * @param {number} ping.accuracy - GPS accuracy in meters (optional)
   * @returns {Promise<boolean>} True if successful
   */
  const sendPing = useCallback(
    async (ping) => {
      if (!jwtToken) {
        setLastError("Not authenticated. Please refresh the page.");
        return false;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/driver/ping`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(ping),
        });

        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please slow down.");
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Failed to send ping: ${response.status}`
          );
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setLastError(errorMessage);
        return false;
      }
    },
    [jwtToken, apiBaseUrl]
  );

  /**
   * Update driver status
   * @param {string} status - 'idle' | 'break' | 'onroute'
   * @returns {Promise<boolean>} True if successful
   */
  const updateStatus = useCallback(
    async (status) => {
      if (!jwtToken) {
        return false;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/driver/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error("Failed to update status");
        }

        return true;
      } catch (err) {
        console.error("Failed to update status:", err);
        return false;
      }
    },
    [jwtToken, apiBaseUrl]
  );

  return {
    routes,
    driverData,
    startShift,
    endShift,
    sendPing,
    updateStatus,
    isLoading,
    isLoadingRoutes,
    lastError,
    jwtToken,
    isAuthenticated: !!jwtToken,
  };
}
