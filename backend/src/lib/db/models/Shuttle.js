import mongoose from 'mongoose';

const ShuttleSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    deviceId: {
      type: String,
      trim: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    capacity: {
      type: Number,
      default: 40,
      min: 1,
    },
    status: {
      type: String,
      enum: ['available', 'in_service', 'out_of_service', 'maintenance'],
      default: 'available',
    },
    currentDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        default: [0, 0],
      },
    },
    heading: {
      type: Number,
      min: 0,
      max: 359,
    },
    speedKph: {
      type: Number,
      min: 0,
    },
    lastPingAt: {
      type: Date,
    },
    
    // ===== NEW FIELDS FOR DIRECTIONAL TRACKING =====
    
    // Current stop or last passed stop
    currentStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      default: null,
    },
    
    // Next scheduled stop
    nextStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      default: null,
    },
    
    // For bidirectional routes: which direction is the shuttle going?
    currentDirection: {
      type: String,
      enum: ['forward', 'backward', null],
      default: null,
      /*
        forward: following the stops sequence (0 → 1 → 2 → 3)
        backward: reverse sequence (3 → 2 → 1 → 0)
      */
    },
    
    // Current sequence position in the route (0-indexed)
    currentSequence: {
      type: Number,
      default: null,
    },
    
    // Timestamp when shuttle arrived at current stop
    arrivedAtCurrentStopAt: {
      type: Date,
      default: null,
    },
    
    // Timestamp when shuttle departed from current stop
    departedFromCurrentStopAt: {
      type: Date,
      default: null,
    },
    
    // Is the shuttle currently at a stop or between stops?
    isAtStop: {
      type: Boolean,
      default: false,
    },
    
    // Estimated arrival time at next stop (calculated by ETA service)
    estimatedArrivalAtNextStop: {
      type: Date,
      default: null,
    },
    
    // Trip progress (0.0 to 1.0) - how far along the current leg
    tripProgress: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    
    // Total stops completed in current shift
    stopsCompletedThisShift: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for location queries
ShuttleSchema.index({ currentLocation: '2dsphere' });
ShuttleSchema.index({ routeId: 1 });
ShuttleSchema.index({ status: 1 });
ShuttleSchema.index({ currentDriverId: 1 });
ShuttleSchema.index({ lastPingAt: -1 });
ShuttleSchema.index({ currentStopId: 1 });
ShuttleSchema.index({ nextStopId: 1 });

// Method: Update shuttle position and calculate next stop
ShuttleSchema.methods.updatePosition = async function(lat, lng, route) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [lng, lat],
  };
  
  if (!route || !route.stops || route.stops.length === 0) {
    return this;
  }
  
  // Find closest stop
  const Stop = mongoose.model('Stop');
  const closestStop = await this.findClosestStop(route.stops, Stop);
  
  if (closestStop && closestStop.distance < 50) { // Within 50 meters
    // Shuttle is at a stop
    this.isAtStop = true;
    this.currentStopId = closestStop.stopId;
    this.currentSequence = closestStop.sequence;
    
    if (!this.arrivedAtCurrentStopAt) {
      this.arrivedAtCurrentStopAt = new Date();
      this.stopsCompletedThisShift += 1;
    }
  } else {
    // Shuttle is between stops
    this.isAtStop = false;
    this.arrivedAtCurrentStopAt = null;
  }
  
  // Calculate next stop
  if (this.currentSequence !== null) {
    const nextSequence = route.routeType === 'loop'
      ? (this.currentSequence + 1) % route.stops.length
      : Math.min(this.currentSequence + 1, route.stops.length - 1);
    
    this.nextStopId = route.stops[nextSequence]?.stopId;
  }
  
  return this;
};

// Method: Find closest stop to current position
ShuttleSchema.methods.findClosestStop = async function(routeStops, StopModel) {
  const [lng, lat] = this.currentLocation.coordinates;
  
  let closestStop = null;
  let minDistance = Infinity;
  
  for (const routeStop of routeStops) {
    const stop = await StopModel.findById(routeStop.stopId);
    if (!stop) continue;
    
    const [stopLng, stopLat] = stop.location.coordinates;
    const distance = calculateDistance(lat, lng, stopLat, stopLng);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestStop = {
        stopId: routeStop.stopId,
        sequence: routeStop.sequence,
        distance: distance,
      };
    }
  }
  
  return closestStop;
};

// Helper: Haversine distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const Shuttle = mongoose.models.Shuttle || mongoose.model('Shuttle', ShuttleSchema);

export default Shuttle;