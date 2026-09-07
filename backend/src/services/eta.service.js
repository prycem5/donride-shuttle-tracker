import Shuttle from '../lib/db/models/Shuttle.js';
import Stop from '../lib/db/models/Stop.js';
import Route from '../lib/db/models/Route.js';
import Arrival from '../lib/db/models/Arrival.js';
import Ping from '../lib/db/models/Ping.js';
import { calculateDistance } from '../lib/utils.js';

/**
 * Calculate and store ETAs for all stops on a shuttle's route
 * This is called periodically by a background worker or manually
 */
export const calculateAndStoreArrivals = async (shuttleId, routeId) => {
  try {
    console.log(`🔄 Calculating arrivals for shuttle ${shuttleId} on route ${routeId}`);

    // Get shuttle with current position
    const shuttle = await Shuttle.findById(shuttleId)
      .populate('routeId')
      .populate('currentStopId')
      .populate('nextStopId');

    if (!shuttle) {
      console.log('❌ Shuttle not found');
      return null;
    }

    if (shuttle.status !== 'in_service') {
      console.log('⚠️ Shuttle not in service');
      return null;
    }

    // Get route with stops
    const route = await Route.findById(routeId).populate('stops.stopId');

    if (!route || !route.stops || route.stops.length === 0) {
      console.log('❌ Route not found or has no stops');
      return null;
    }

    // Get shuttle's average speed from recent pings
    const avgSpeed = await getAverageSpeed(shuttleId);
    const defaultSpeed = 20; // 20 km/h default
    const speed = avgSpeed > 5 ? avgSpeed : defaultSpeed;

    console.log(`📊 Using speed: ${speed.toFixed(1)} km/h`);

    const arrivals = [];
    const currentSequence = shuttle.currentSequence ?? 0;

    // Calculate ETA for each upcoming stop
    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];

      // Calculate ETA based on current position
      let etaSeconds;

      if (i < currentSequence) {
        // Stop already passed - handle loop routes
        if (route.routeType === 'loop') {
          // Calculate time to complete loop and reach this stop
          etaSeconds = calculateLoopETA(route, currentSequence, i);
        } else {
          // Non-loop route - stop unreachable this trip
          continue;
        }
      } else if (i === currentSequence) {
        // Currently at this stop
        if (shuttle.isAtStop) {
          etaSeconds = 0; // At stop now
        } else {
          // Between stops - calculate based on distance
          etaSeconds = calculateETAFromPosition(
            shuttle.currentLocation,
            stop.stopId.location,
            speed
          );
        }
      } else {
        // Future stop - sum up segment times
        etaSeconds = calculateFutureStopETA(route, currentSequence, i, speed);
      }

      // Determine confidence level
      const confidence = calculateConfidence(etaSeconds, avgSpeed, i - currentSequence);

      // Create or update arrival record
      const arrival = await Arrival.findOneAndUpdate(
        {
          stopId: stop.stopId._id,
          shuttleId: shuttle._id,
        },
        {
          stopId: stop.stopId._id,
          shuttleId: shuttle._id,
          etaSeconds: Math.max(0, Math.round(etaSeconds)),
          confidence: confidence,
          computedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
        }
      );

      arrivals.push({
        stopId: stop.stopId._id,
        stopName: stop.stopId.name,
        etaSeconds: arrival.etaSeconds,
        etaMinutes: Math.ceil(arrival.etaSeconds / 60),
        confidence: arrival.confidence,
      });

      console.log(`  ✅ ${stop.stopId.name}: ${Math.ceil(etaSeconds / 60)} min (${confidence.toFixed(2)} confidence)`);
    }

    return {
      shuttleId: shuttle._id,
      routeId: route._id,
      arrivalsCalculated: arrivals.length,
      arrivals: arrivals,
      calculatedAt: new Date(),
    };
  } catch (error) {
    console.error('❌ Error calculating arrivals:', error);
    throw error;
  }
};

/**
 * Calculate ETA for a future stop based on segment times
 */
function calculateFutureStopETA(route, currentSequence, targetSequence, avgSpeed) {
  let totalTime = 0;

  for (let i = currentSequence + 1; i <= targetSequence; i++) {
    const segment = route.stops[i];
    
    // Use route's estimated time if available, otherwise calculate from distance
    if (segment.estimatedTimeFromPrevious) {
      totalTime += segment.estimatedTimeFromPrevious;
    } else if (segment.distanceFromPrevious) {
      // Calculate time based on distance and speed
      const timeHours = segment.distanceFromPrevious / 1000 / avgSpeed;
      totalTime += timeHours * 3600; // Convert to seconds
    } else {
      // Default: 2 minutes between stops
      totalTime += 120;
    }
  }

  return totalTime;
}

/**
 * Calculate ETA for loop routes when target is before current position
 */
function calculateLoopETA(route, currentSequence, targetSequence) {
  let totalTime = 0;

  // Time to end of route
  for (let i = currentSequence + 1; i < route.stops.length; i++) {
    totalTime += route.stops[i].estimatedTimeFromPrevious || 120;
  }

  // Time from start to target
  for (let i = 1; i <= targetSequence; i++) {
    totalTime += route.stops[i].estimatedTimeFromPrevious || 120;
  }

  return totalTime;
}

/**
 * Calculate ETA based on current GPS position and target location
 */
function calculateETAFromPosition(currentLocation, targetLocation, speedKph) {
  const [currentLng, currentLat] = currentLocation.coordinates;
  const [targetLng, targetLat] = targetLocation.coordinates;

  const distanceMeters = calculateDistance(currentLat, currentLng, targetLat, targetLng);

  // Convert speed from km/h to m/s
  const speedMs = (speedKph * 1000) / 3600;

  // Calculate time in seconds
  const timeSeconds = distanceMeters / speedMs;

  return timeSeconds;
}

/**
 * Get average speed from recent pings
 */
async function getAverageSpeed(shuttleId) {
  try {
    const recentPings = await Ping.find({ shuttleId })
      .sort({ ts: -1 })
      .limit(10);

    if (recentPings.length === 0) {
      return 0;
    }

    const speeds = recentPings.map(p => p.speedKph).filter(s => s > 0);

    if (speeds.length === 0) {
      return 0;
    }

    const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    return avgSpeed;
  } catch (error) {
    console.error('Error calculating average speed:', error);
    return 0;
  }
}

/**
 * Calculate confidence level for ETA
 * Factors: distance, speed consistency, time until arrival
 */
function calculateConfidence(etaSeconds, avgSpeed, stopsAway) {
  let confidence = 0.8; // Base confidence

  // Reduce confidence if no speed data
  if (avgSpeed < 5) {
    confidence -= 0.2;
  }

  // Reduce confidence for distant stops
  if (stopsAway > 5) {
    confidence -= 0.1;
  }

  // Reduce confidence for far-future arrivals
  if (etaSeconds > 1800) { // > 30 minutes
    confidence -= 0.2;
  }

  return Math.max(0.3, Math.min(1.0, confidence));
}

/**
 * Calculate arrivals for all active shuttles
 * Called by background worker
 */
export const calculateAllActiveShuttleArrivals = async () => {
  try {
    console.log('🔄 Calculating arrivals for all active shuttles...');

    const activeShuttles = await Shuttle.find({ 
      status: 'in_service',
      routeId: { $ne: null }
    });

    console.log(`📊 Found ${activeShuttles.length} active shuttles`);

    const results = [];

    for (const shuttle of activeShuttles) {
      try {
        const result = await calculateAndStoreArrivals(shuttle._id, shuttle.routeId);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`❌ Error calculating for shuttle ${shuttle._id}:`, error.message);
      }
    }

    console.log(`✅ Calculated arrivals for ${results.length} shuttles`);

    return {
      shuttlesProcessed: results.length,
      results: results,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('❌ Error in calculateAllActiveShuttleArrivals:', error);
    throw error;
  }
};