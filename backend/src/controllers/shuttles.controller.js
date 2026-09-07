import Shuttle from '../lib/db/models/Shuttle.js';
import Ping from '../lib/db/models/Ping.js';
import Stop from '../lib/db/models/Stop.js';
import Route from '../lib/db/models/Route.js';
import mongoose from 'mongoose';

export const getLiveShuttles = async (req, res, next) => {
  try {
    const { route_id, pickup_stop_id, dropoff_stop_id } = req.query;

    console.log('📍 getLiveShuttles called with:', { 
      route_id, 
      pickup_stop_id, 
      dropoff_stop_id 
    });

    // ========================================
    // SCENARIO 1: Query by specific route_id
    // ========================================
    if (route_id) {
      return await getShuttlesByRoute(route_id, res, next);
    }

    // ========================================
    // SCENARIO 2: Query by pickup + dropoff stops
    // ========================================
    if (pickup_stop_id && dropoff_stop_id) {
      return await getShuttlesByStops(pickup_stop_id, dropoff_stop_id, res, next);
    }

    // ========================================
    // SCENARIO 3: Get all active shuttles
    // ========================================
    return await getAllActiveShuttles(res, next);

  } catch (error) {
    console.error('❌ Error in getLiveShuttles:', error);
    next(error);
  }
};

// ========================================
// HELPER: Get shuttles by route ID
// ========================================
async function getShuttlesByRoute(routeId, res, next) {
  try {
    console.log('🔍 Finding shuttles for route:', routeId);

    const shuttles = await Shuttle.find({
      status: 'in_service',
      routeId: routeId,
    })
      .populate('routeId')
      .populate('currentStopId')
      .populate('nextStopId')
      .lean();

    console.log(`✅ Found ${shuttles.length} shuttle(s) on route ${routeId}`);

    const shuttlesWithPings = await enhanceShuttlesWithPings(shuttles);

    return res.json({
      success: true,
      count: shuttlesWithPings.length,
      data: shuttlesWithPings,
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// HELPER: Get shuttles by pickup/dropoff stops
// ========================================
async function getShuttlesByStops(pickupStopId, dropoffStopId, res, next) {
  try {
    console.log('🔍 Finding routes serving both stops:', { 
      pickup: pickupStopId, 
      dropoff: dropoffStopId 
    });

    // Convert string IDs to ObjectId
    const pickupObjId = new mongoose.Types.ObjectId(pickupStopId);
    const dropoffObjId = new mongoose.Types.ObjectId(dropoffStopId);

    // Find routes that have BOTH stops in the correct order
    const validRoutes = await Route.find({
      active: true,
      'stops.stopId': { $all: [pickupObjId, dropoffObjId] }
    }).populate('stops.stopId');

    console.log(`📍 Found ${validRoutes.length} route(s) with both stops`);

    // Filter routes where the trip is valid
    const routesInCorrectOrder = validRoutes.filter(route => {
      const pickupIndex = route.stops.findIndex(
        s => s.stopId._id.toString() === pickupStopId
      );
      const dropoffIndex = route.stops.findIndex(
        s => s.stopId._id.toString() === dropoffStopId
      );

      // Both stops must exist on the route
      if (pickupIndex === -1 || dropoffIndex === -1) {
        console.log(`  ❌ Route "${route.name}": stops not found on route`);
        return false;
      }

      // For loop routes: any combination is valid (the shuttle will loop back)
      if (route.routeType === 'loop') {
        console.log(`  ✅ Route "${route.name}" (loop): pickup at #${pickupIndex}, dropoff at #${dropoffIndex} - VALID`);
        return true;
      }

      // For linear/bidirectional routes: dropoff must come after pickup
      const isValidOrder = dropoffIndex > pickupIndex;

      if (isValidOrder) {
        console.log(`  ✅ Route "${route.name}" (${route.routeType}): pickup at #${pickupIndex}, dropoff at #${dropoffIndex}`);
      } else {
        console.log(`  ❌ Route "${route.name}" (${route.routeType}): dropoff before pickup (not valid for non-loop routes)`);
      }

      return isValidOrder;
    });

    if (routesInCorrectOrder.length === 0) {
      console.log('⚠️  No routes serve this pickup→dropoff combination');
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No routes currently serve this pickup and dropoff combination in the correct order.'
      });
    }

    console.log(`✅ ${routesInCorrectOrder.length} route(s) serve this combination correctly`);

    // Get valid route IDs
    const validRouteIds = routesInCorrectOrder.map(r => r._id);

    // Find shuttles on these routes
    const shuttles = await Shuttle.find({
      status: 'in_service',
      routeId: { $in: validRouteIds }
    })
      .populate('routeId')
      .populate('currentStopId')
      .populate('nextStopId')
      .lean();

    console.log(`🚐 Found ${shuttles.length} active shuttle(s) on valid routes`);

    // Enhance shuttles with pings and ETA calculations
    const shuttlesWithDetails = await Promise.all(
      shuttles.map(async (shuttle) => {
        // Get latest ping
        const latestPing = await Ping.findOne({
          shuttleId: shuttle._id,
          ts: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
        }).sort({ ts: -1 });

        // Calculate ETA to pickup stop
        const route = routesInCorrectOrder.find(
          r => r._id.toString() === shuttle.routeId._id.toString()
        );

        let etaToPickup = null;
        let etaToDropoff = null;

        if (route && shuttle.currentSequence !== null) {
          etaToPickup = calculateETAToStop(
            route,
            shuttle.currentSequence,
            pickupStopId
          );
          
          // If ETA to pickup exists, calculate total ETA to dropoff
          if (etaToPickup !== null) {
            const timeFromPickupToDropoff = route.getTimeBetweenStops(
              pickupStopId,
              dropoffStopId
            );
            
            // For loop routes, handle wrap-around case
            if (timeFromPickupToDropoff === null && route.routeType === 'loop') {
              // Need to calculate wrap-around time
              const pickupIndex = route.stops.findIndex(
                s => s.stopId._id.toString() === pickupStopId
              );
              const dropoffIndex = route.stops.findIndex(
                s => s.stopId._id.toString() === dropoffStopId
              );
              
              if (dropoffIndex < pickupIndex) {
                // Calculate time to end of route + time from start to dropoff
                let wrapTime = 0;
                
                // Time from pickup to end
                for (let i = pickupIndex + 1; i < route.stops.length; i++) {
                  wrapTime += route.stops[i].estimatedTimeFromPrevious || 60;
                }
                
                // Time from start to dropoff
                for (let i = 1; i <= dropoffIndex; i++) {
                  wrapTime += route.stops[i].estimatedTimeFromPrevious || 60;
                }
                
                etaToDropoff = etaToPickup + wrapTime;
              } else {
                etaToDropoff = etaToPickup + (timeFromPickupToDropoff || 0);
              }
            } else {
              etaToDropoff = etaToPickup + (timeFromPickupToDropoff || 0);
            }
          }
        }

        return {
          ...shuttle,
          ping: latestPing
            ? {
                lat: latestPing.location.coordinates[1],
                lng: latestPing.location.coordinates[0],
                speed: latestPing.speedKph,
                heading: latestPing.heading,
                timestamp: latestPing.ts,
              }
            : null,
          etaToPickup: etaToPickup, // in seconds
          etaToDropoff: etaToDropoff, // in seconds
          currentStop: shuttle.currentStopId?.name || null,
          nextStop: shuttle.nextStopId?.name || null,
          isAtStop: shuttle.isAtStop || false,
        };
      })
    );

    return res.json({
      success: true,
      count: shuttlesWithDetails.length,
      data: shuttlesWithDetails,
      routesServing: routesInCorrectOrder.map(r => ({
        id: r._id,
        name: r.name,
        color: r.color,
      })),
    });
  } catch (error) {
    console.error('❌ Error in getShuttlesByStops:', error);
    next(error);
  }
}

// ========================================
// HELPER: Get all active shuttles
// ========================================
async function getAllActiveShuttles(res, next) {
  try {
    const shuttles = await Shuttle.find({ status: 'in_service' })
      .populate('routeId')
      .populate('currentStopId')
      .populate('nextStopId')
      .lean();

    console.log(`✅ Found ${shuttles.length} active shuttle(s)`);

    const shuttlesWithPings = await enhanceShuttlesWithPings(shuttles);

    return res.json({
      success: true,
      count: shuttlesWithPings.length,
      data: shuttlesWithPings,
    });
  } catch (error) {
    next(error);
  }
}

// ========================================
// HELPER: Add ping data to shuttles
// ========================================
async function enhanceShuttlesWithPings(shuttles) {
  return await Promise.all(
    shuttles.map(async (shuttle) => {
      const latestPing = await Ping.findOne({
        shuttleId: shuttle._id,
        ts: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).sort({ ts: -1 });

      return {
        ...shuttle,
        ping: latestPing
          ? {
              lat: latestPing.location.coordinates[1],
              lng: latestPing.location.coordinates[0],
              speed: latestPing.speedKph,
              heading: latestPing.heading,
              timestamp: latestPing.ts,
            }
          : null,
        currentStop: shuttle.currentStopId?.name || null,
        nextStop: shuttle.nextStopId?.name || null,
        isAtStop: shuttle.isAtStop || false,
      };
    })
  );
}

// ========================================
// HELPER: Calculate ETA from current position to target stop
// ========================================
function calculateETAToStop(route, currentSequence, targetStopId) {
  // Find the sequence number of the target stop
  const targetIndex = route.stops.findIndex(
    s => s.stopId._id.toString() === targetStopId.toString()
  );

  if (targetIndex === -1) {
    console.log('⚠️  Target stop not found in route');
    return null;
  }

  // If target is before current position, handle loop routes
  if (targetIndex < currentSequence) {
    if (route.routeType === 'loop') {
      // Calculate time to complete loop and reach target
      let totalTime = 0;
      
      // Time from current to end of route
      for (let i = currentSequence + 1; i < route.stops.length; i++) {
        totalTime += route.stops[i].estimatedTimeFromPrevious || 60;
      }
      
      // Time from start to target
      for (let i = 1; i <= targetIndex; i++) {
        totalTime += route.stops[i].estimatedTimeFromPrevious || 60;
      }
      
      return totalTime;
    } else {
      // Non-loop route: target is unreachable in this direction
      console.log('⚠️  Target stop already passed (non-loop route)');
      return null;
    }
  }

  // Target is ahead: sum up times between stops
  let totalTime = 0;
  for (let i = currentSequence + 1; i <= targetIndex; i++) {
    totalTime += route.stops[i].estimatedTimeFromPrevious || 60; // Default 60s
  }

  return totalTime;
}
