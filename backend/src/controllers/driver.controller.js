import Ping from '../lib/db/models/Ping.js';
import Shuttle from '../lib/db/models/Shuttle.js';
import Driver from '../lib/db/models/Driver.js';
import Route from '../lib/db/models/Route.js';
import { publishToPing } from '../config/ably.js';

export const sendPing = async (req, res, next) => {
  try {
    const { shuttleId, lat, lng, speed, heading, accuracy, timestamp } = req.body;
    const driverId = req.user.driverId;

    // Create ping record
    const ping = await Ping.create({
      shuttleId,
      driverId,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      speedKph: speed,
      heading,
      accuracyM: accuracy,
      ts: timestamp ? new Date(timestamp) : new Date(),
      source: 'driver_app',
    });

    // Get the shuttle with its route information
    const shuttle = await Shuttle.findById(shuttleId).populate('routeId');
    
    if (shuttle && shuttle.routeId) {
      // Update shuttle position with intelligent stop tracking
      await shuttle.updatePosition(lat, lng, shuttle.routeId);
      
      // Save the updated shuttle
      await shuttle.save();
    } else {
      // Fallback: simple update without route intelligence
      await Shuttle.findByIdAndUpdate(shuttleId, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        heading,
        speedKph: speed,
        lastPingAt: new Date(),
      });
    }

    // Broadcast to realtime channel with enhanced data
    await publishToPing(shuttleId, {
      shuttleId,
      lat,
      lng,
      speed,
      heading,
      timestamp: timestamp || new Date().toISOString(),
      driverId,
      currentStopId: shuttle?.currentStopId || null,
      nextStopId: shuttle?.nextStopId || null,
      isAtStop: shuttle?.isAtStop || false,
    });

    res.status(201).json({
      success: true,
      data: {
        pingId: ping._id,
        timestamp: ping.ts,
        currentStop: shuttle?.currentStopId || null,
        nextStop: shuttle?.nextStopId || null,
        isAtStop: shuttle?.isAtStop || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const driverId = req.user.driverId;

    await Driver.findByIdAndUpdate(driverId, { 
      status,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const startShift = async (req, res, next) => {
  try {
    const { routeId } = req.body;
    const driverId = req.user.driverId;

    console.log('🚀 Starting shift for driver:', driverId, 'on route:', routeId);

    // 1. Validate Route Exists and populate stops
    const route = await Route.findOne({ 
      _id: routeId,
      active: true 
    }).populate('stops.stopId');

    if (!route) {
      console.log('❌ Route not found or inactive:', routeId);
      return res.status(404).json({ 
        success: false, 
        message: "Route not found or inactive" 
      });
    }

    console.log('✅ Route found:', route.name);
    console.log('📍 Route stops:', route.stops?.length || 0);

    if (!route.stops || route.stops.length === 0) {
      console.log('❌ Route has no stops configured');
      return res.status(400).json({
        success: false,
        message: "Route has no stops configured. Please contact admin.",
        debug: {
          routeId: route._id,
          routeName: route.name,
          stopsCount: route.stops?.length || 0
        }
      });
    }

    // 2. Check Shuttle Availability
    const shuttle = await Shuttle.findById(route.shuttleId);
    
    if (!shuttle) {
      console.log('❌ Shuttle not found:', route.shuttleId);
      return res.status(404).json({ 
        success: false, 
        message: "Shuttle not found for this route" 
      });
    }

    console.log('✅ Shuttle found:', shuttle.label, 'Status:', shuttle.status);

    if (shuttle.status !== 'available') {
      console.log('❌ Shuttle not available:', shuttle.status);
      return res.status(400).json({ 
        success: false, 
        message: `Shuttle is not available. Current status: ${shuttle.status}. It may be in use by another driver.` 
      });
    }

    // 3. Check if driver already on shift
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      console.log('❌ Driver not found:', driverId);
      return res.status(404).json({
        success: false,
        message: "Driver profile not found"
      });
    }

    console.log('✅ Driver found:', driver.userId, 'Status:', driver.status);
    
    if (driver.status === 'onroute' || driver.currentRouteId) {
      console.log('❌ Driver already on shift');
      return res.status(400).json({ 
        success: false, 
        message: "You are already on a shift. Please end your current shift first.",
        currentRoute: driver.currentRouteId
      });
    }

    // 4. Update Driver Record
    console.log('🔧 Updating driver with route and shuttle info...');
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        currentRouteId: route._id,
        currentShuttleId: route.shuttleId,
        status: 'onroute',
        shiftStartedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true } // Return updated document
    );

    console.log('✅ Driver updated:');
    console.log('   - currentRouteId:', updatedDriver.currentRouteId);
    console.log('   - currentShuttleId:', updatedDriver.currentShuttleId);
    console.log('   - status:', updatedDriver.status);

    // 5. Update Shuttle with Route Assignment and Initial State
    console.log('🔧 Updating shuttle with driver and route info...');
    const updatedShuttle = await Shuttle.findByIdAndUpdate(
      route.shuttleId,
      {
        status: 'in_service',
        currentDriverId: driverId,
        routeId: route._id,
        // Initialize directional tracking
        currentStopId: route.stops[0]?.stopId?._id || route.stops[0]?.stopId || null,
        nextStopId: route.stops[1]?.stopId?._id || route.stops[1]?.stopId || null,
        currentSequence: 0,
        currentDirection: 'forward',
        isAtStop: true, // Assume starting at first stop
        arrivedAtCurrentStopAt: new Date(),
        stopsCompletedThisShift: 0,
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('✅ Shuttle updated:');
    console.log('   - status:', updatedShuttle.status);
    console.log('   - currentDriverId:', updatedShuttle.currentDriverId);
    console.log('   - routeId:', updatedShuttle.routeId);
    console.log('   - currentStopId:', updatedShuttle.currentStopId);
    console.log('   - nextStopId:', updatedShuttle.nextStopId);

    // 6. Return Success Response with route details
    console.log('✅ Shift started successfully!');
    
    res.json({
      success: true,
      message: 'Shift started successfully',
      data: {
        driverId: driverId,
        routeId: route._id,
        routeName: route.name,
        shuttleId: route.shuttleId,
        shuttleLabel: shuttle.label,
        status: 'onroute',
        startedAt: new Date().toISOString(),
        routeInfo: {
          totalStops: route.stops.length,
          routeType: route.routeType,
          estimatedLoopTime: route.averageLoopTime,
        },
        currentStop: {
          id: route.stops[0]?.stopId?._id || route.stops[0]?.stopId,
          name: route.stops[0]?.stopId?.name || 'First Stop',
          sequence: 0
        },
        nextStop: route.stops[1] ? {
          id: route.stops[1]?.stopId?._id || route.stops[1]?.stopId,
          name: route.stops[1]?.stopId?.name || 'Second Stop',
          sequence: 1
        } : null,
      }
    });

  } catch (error) {
    console.error('❌ Error in startShift:', error);
    next(error);
  }
};

export const endShift = async (req, res, next) => {
  try {
    const driverId = req.user.driverId;

    console.log('🛑 Ending shift for driver:', driverId);

    // 1. Get Current Driver
    const driver = await Driver.findById(driverId);

    if (!driver) {
      console.log('❌ Driver not found:', driverId);
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    console.log('✅ Driver found:', driver.userId);

    const shiftStartedAt = driver.shiftStartedAt;
    const currentShuttleId = driver.currentShuttleId;

    // 2. Get shuttle stats before clearing
    const shuttle = await Shuttle.findById(currentShuttleId);
    const stopsCompleted = shuttle?.stopsCompletedThisShift || 0;

    console.log('📊 Shift stats:');
    console.log('   - Shuttle:', currentShuttleId);
    console.log('   - Stops completed:', stopsCompleted);

    // 3. Calculate shift duration
    const shiftDuration = shiftStartedAt 
      ? Math.floor((new Date() - new Date(shiftStartedAt)) / 1000) 
      : 0;

    console.log('   - Duration:', Math.floor(shiftDuration / 60), 'minutes');

    // 4. Clear Driver Assignment
    console.log('🔧 Clearing driver assignment...');
    await Driver.findByIdAndUpdate(driverId, {
      currentRouteId: null,
      currentShuttleId: null,
      status: 'idle',
      shiftEndedAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Driver cleared');

    // 5. Clear Shuttle Assignment and Directional State
    if (currentShuttleId) {
      console.log('🔧 Clearing shuttle assignment...');
      await Shuttle.findByIdAndUpdate(currentShuttleId, {
        status: 'available',
        currentDriverId: null,
        routeId: null,
        // Clear directional tracking
        currentStopId: null,
        nextStopId: null,
        currentSequence: null,
        currentDirection: null,
        isAtStop: false,
        arrivedAtCurrentStopAt: null,
        departedFromCurrentStopAt: null,
        estimatedArrivalAtNextStop: null,
        tripProgress: 0,
        stopsCompletedThisShift: 0,
        updatedAt: new Date()
      });
      console.log('✅ Shuttle cleared');
    }

    // 6. Return success with shift statistics
    console.log('✅ Shift ended successfully!');
    
    res.json({
      success: true,
      message: 'Shift ended successfully',
      data: {
        driverId: driverId,
        shiftDuration: shiftDuration,
        shiftDurationMinutes: Math.floor(shiftDuration / 60),
        stopsCompleted: stopsCompleted,
        endedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in endShift:', error);
    next(error);
  }
};