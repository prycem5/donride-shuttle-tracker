// lib/realtime/hooks.js
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getChannel } from "./ablyClient";

/**
 * useChannel: subscribe to an Ably channel/event and run a callback on messages.
 * Auto-unsubscribes on unmount or when inputs change.
 */
export function useChannel(channelName, eventName, onMessage) {
  const { getToken } = useAuth();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!channelName || !eventName || !handlerRef.current) return;
    const channel = getChannel(channelName, getToken, apiBaseUrl);
    if (!channel) return;

    const listener = (msg) => {
      try {
        const payload =
          typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
        handlerRef.current(payload, msg);
      } catch {
        handlerRef.current(msg.data, msg);
      }
    };

    channel.subscribe(eventName, listener);
    return () => {
      channel.unsubscribe(eventName, listener);
    };
  }, [channelName, eventName, getToken, apiBaseUrl]);
}

/**
 * useShuttlePosition: returns latest GPS ping for a shuttleId (or null)
 * Channel: shuttle:{shuttleId}, Event: 'ping'
 */
export function useShuttlePosition(shuttleId) {
  const [position, setPosition] = useState(null);

  useChannel(shuttleId ? `shuttle:${shuttleId}` : null, "ping", (data) =>
    setPosition(data || null)
  );

  return position;
}

/**
 * useStopArrivals: returns latest ETA payloads for a stopId.
 * Channel: stop:{stopId}, Event: 'arrival'
 */
export function useStopArrivals(stopId) {
  const [arrivals, setArrivals] = useState(null);

  useChannel(stopId ? `stop:${stopId}` : null, "arrival", (data) =>
    setArrivals(data || null)
  );

  return arrivals;
}
