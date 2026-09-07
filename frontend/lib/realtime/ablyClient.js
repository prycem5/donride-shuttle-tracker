// lib/realtime/ablyClient.js
"use client";

// ✅ Use the promises build in ESM/app-client
// If you see "Module not found", run:  npm i ably
import Ably from "ably/promises";

let _client = null;

export function getAblyClient(getClerkToken, apiBaseUrl) {
  if (typeof window === "undefined") return null; // guard against SSR

  if (!_client) {
    if (!getClerkToken || !apiBaseUrl) {
      console.warn("Ably authentication is unavailable");
      return null;
    }

    // The permanent ABLY_API_KEY stays on the backend. Ably calls this
    // callback when it needs a short-lived, capability-limited token.
    // See: https://ably.com/docs/auth/token
    _client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const clerkToken = await getClerkToken();
          if (!clerkToken) {
            throw new Error("Clerk session token unavailable");
          }

          const response = await fetch(`${apiBaseUrl}/api/realtime/token`, {
            headers: {
              Authorization: `Bearer ${clerkToken}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Realtime authentication failed: ${response.status}`);
          }

          const result = await response.json();
          if (!result.success || !result.data) {
            throw new Error("Invalid realtime authentication response");
          }

          callback(null, result.data);
        } catch (error) {
          callback(error, null);
        }
      },
    });

    // (Optional) debug connection lifecycle in dev
    if (process.env.NODE_ENV !== "production") {
      _client.connection.on((stateChange) => {
        // e.g. connecting, connected, disconnected, suspended, failed
        // console.log('[Ably]', stateChange);
      });
    }
  }

  return _client;
}

export function getChannel(name, getClerkToken, apiBaseUrl) {
  const client = getAblyClient(getClerkToken, apiBaseUrl);
  if (!client || !name) return null;
  return client.channels.get(name);
}
