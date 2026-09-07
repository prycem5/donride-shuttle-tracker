import { publishToPing, publishToArrival } from '../config/ably.js';

export const broadcastShuttleUpdate = async (shuttleId, pingData) => {
  try {
    await publishToPing(shuttleId, pingData);
    console.log(`📡 Broadcasted shuttle ${shuttleId} update`);
  } catch (error) {
    console.error('❌ Failed to broadcast shuttle update:', error);
  }
};

export const broadcastArrivalUpdate = async (stopId, arrivalData) => {
  try {
    await publishToArrival(stopId, arrivalData);
    console.log(`📡 Broadcasted arrival update for stop ${stopId}`);
  } catch (error) {
    console.error('❌ Failed to broadcast arrival:', error);
  }
};
