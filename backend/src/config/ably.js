import Ably from 'ably';

const ably = new Ably.Rest({
  key: process.env.ABLY_API_KEY,
});

export const CHANNELS = {
  shuttle: (id) => `shuttle:${id}`,
  stop: (id) => `stop:${id}`,
  route: (id) => `route:${id}`,
  global: 'global',
};

export const publishToPing = async (shuttleId, data) => {
  try {
    const channel = ably.channels.get(CHANNELS.shuttle(shuttleId));
    await channel.publish('ping', data);
    console.log(`📡 Published ping to shuttle:${shuttleId}`);
    return true;
  } catch (error) {
    console.error('❌ Error publishing to Ably:', error);
    throw error;
  }
};

export const publishToArrival = async (stopId, data) => {
  try {
    const channel = ably.channels.get(CHANNELS.stop(stopId));
    await channel.publish('arrival', data);
    console.log(`📡 Published arrival to stop:${stopId}`);
    return true;
  } catch (error) {
    console.error('❌ Error publishing arrival to Ably:', error);
    throw error;
  }
};

export const publishToGlobal = async (eventType, data) => {
  try {
    const channel = ably.channels.get(CHANNELS.global);
    await channel.publish(eventType, data);
    console.log(`📡 Published ${eventType} to global channel`);
    return true;
  } catch (error) {
    console.error('❌ Error publishing to global channel:', error);
    throw error;
  }
};

export default ably;