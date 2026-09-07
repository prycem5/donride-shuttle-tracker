import Arrival from '../lib/db/models/Arrival.js';
import Stop from '../lib/db/models/Stop.js';
import Route from '../lib/db/models/Route.js';

/**
 * GET /api/arrivals/stop/:stopId
 * Get upcoming shuttle arrivals for a specific stop
 */
export const getStopArrivals = async (req, res, next) => {
  try {
    const { stopId } = req.params;
    const { limit = 5 } = req.query;

    console.log(`📍 Getting arrivals for stop: ${stopId}`);

    // Validate stop exists
    const stop = await Stop.findById(stopId);
    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    // Get recent arrivals (computed within last 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const arrivals = await Arrival.find({
      stopId: stopId,
      computedAt: { $gte: twoMinutesAgo },
      etaSeconds: { $gte: 0 }, // Only future arrivals
    })
      .populate('shuttleId', 'label capacity status currentStopId nextStopId')
      .populate({
        path: 'shuttleId',
        populate: {
          path: 'routeId',
          select: 'name color shortName',
        },
      })
      .sort({ etaSeconds: 1 }) // Closest arrival first
      .limit(parseInt(limit));

    console.log(`✅ Found ${arrivals.length} upcoming arrivals`);

    // Format response
    const formattedArrivals = arrivals.map(arrival => ({
      arrivalId: arrival._id,
      shuttle: {
        id: arrival.shuttleId._id,
        label: arrival.shuttleId.label,
        capacity: arrival.shuttleId.capacity,
        status: arrival.shuttleId.status,
        currentStop: arrival.shuttleId.currentStopId,
        nextStop: arrival.shuttleId.nextStopId,
      },
      route: {
        id: arrival.shuttleId.routeId?._id,
        name: arrival.shuttleId.routeId?.name,
        color: arrival.shuttleId.routeId?.color,
      },
      etaSeconds: arrival.etaSeconds,
      etaMinutes: Math.ceil(arrival.etaSeconds / 60),
      confidence: arrival.confidence,
      computedAt: arrival.computedAt,
    }));

    res.json({
      success: true,
      count: formattedArrivals.length,
      stop: {
        id: stop._id,
        name: stop.name,
        code: stop.code,
      },
      data: formattedArrivals,
    });
  } catch (error) {
    console.error('❌ Error getting stop arrivals:', error);
    next(error);
  }
};

/**
 * GET /api/arrivals/route/:routeId
 * Get all upcoming arrivals for all stops on a route
 */
export const getRouteArrivals = async (req, res, next) => {
  try {
    const { routeId } = req.params;

    console.log(`📍 Getting arrivals for route: ${routeId}`);

    // Validate route exists
    const route = await Route.findById(routeId).populate('stops.stopId');
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    }

    // Get stop IDs from route
    const stopIds = route.stops.map(s => s.stopId._id);

    // Get recent arrivals for all stops on route
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const arrivals = await Arrival.find({
      stopId: { $in: stopIds },
      computedAt: { $gte: twoMinutesAgo },
      etaSeconds: { $gte: 0 },
    })
      .populate('stopId', 'name code')
      .populate('shuttleId', 'label capacity')
      .sort({ etaSeconds: 1 });

    console.log(`✅ Found ${arrivals.length} arrivals across ${stopIds.length} stops`);

    // Group by stop
    const arrivalsByStop = {};
    arrivals.forEach(arrival => {
      const stopId = arrival.stopId._id.toString();
      if (!arrivalsByStop[stopId]) {
        arrivalsByStop[stopId] = {
          stop: {
            id: arrival.stopId._id,
            name: arrival.stopId.name,
            code: arrival.stopId.code,
          },
          arrivals: [],
        };
      }
      arrivalsByStop[stopId].arrivals.push({
        arrivalId: arrival._id,
        shuttle: {
          id: arrival.shuttleId._id,
          label: arrival.shuttleId.label,
          capacity: arrival.shuttleId.capacity,
        },
        etaSeconds: arrival.etaSeconds,
        etaMinutes: Math.ceil(arrival.etaSeconds / 60),
        confidence: arrival.confidence,
        computedAt: arrival.computedAt,
      });
    });

    res.json({
      success: true,
      route: {
        id: route._id,
        name: route.name,
        color: route.color,
      },
      data: Object.values(arrivalsByStop),
    });
  } catch (error) {
    console.error('❌ Error getting route arrivals:', error);
    next(error);
  }
};

/**
 * GET /api/arrivals/shuttle/:shuttleId
 * Get all upcoming stops for a specific shuttle
 */
export const getShuttleArrivals = async (req, res, next) => {
  try {
    const { shuttleId } = req.params;

    console.log(`📍 Getting arrivals for shuttle: ${shuttleId}`);

    // Get recent arrivals for this shuttle
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const arrivals = await Arrival.find({
      shuttleId: shuttleId,
      computedAt: { $gte: twoMinutesAgo },
      etaSeconds: { $gte: 0 },
    })
      .populate('stopId', 'name code location')
      .sort({ etaSeconds: 1 });

    console.log(`✅ Found ${arrivals.length} upcoming stops`);

    const formattedArrivals = arrivals.map(arrival => ({
      stop: {
        id: arrival.stopId._id,
        name: arrival.stopId.name,
        code: arrival.stopId.code,
        location: arrival.stopId.location,
      },
      etaSeconds: arrival.etaSeconds,
      etaMinutes: Math.ceil(arrival.etaSeconds / 60),
      confidence: arrival.confidence,
      computedAt: arrival.computedAt,
    }));

    res.json({
      success: true,
      count: formattedArrivals.length,
      shuttleId: shuttleId,
      data: formattedArrivals,
    });
  } catch (error) {
    console.error('❌ Error getting shuttle arrivals:', error);
    next(error);
  }
};

/**
 * POST /api/arrivals/calculate
 * Manually trigger ETA calculation for a shuttle
 * (Usually done by background worker, but useful for testing)
 */
export const calculateArrivals = async (req, res, next) => {
  try {
    const { shuttleId, routeId } = req.body;

    console.log(`🔄 Manually calculating arrivals for shuttle: ${shuttleId}`);

    // Import the ETA calculation service
    const { calculateAndStoreArrivals } = await import('../services/eta.service.js');

    const result = await calculateAndStoreArrivals(shuttleId, routeId);

    res.json({
      success: true,
      message: 'Arrivals calculated successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Error calculating arrivals:', error);
    next(error);
  }
};