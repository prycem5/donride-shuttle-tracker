import mongoose from 'mongoose';

const RouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
    },
    longName: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    shuttleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shuttle',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    
    // ===== NEW FIELDS FOR ROUTE TOPOLOGY =====
    
    // Route type: determines how the shuttle moves
    routeType: {
      type: String,
      enum: ['linear', 'loop', 'bidirectional'],
      default: 'loop',
      /*
        linear: A → B → C (one direction only, then returns to start)
        loop: A → B → C → A (continuous circle)
        bidirectional: A ↔ B ↔ C (shuttle goes back and forth)
      */
    },
    
    // Ordered list of stops with sequence information
    stops: [
      {
        stopId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Stop',
          required: true,
        },
        sequence: {
          type: Number,
          required: true,
          min: 0,
        },
        // Optional: specify if this stop is pickup-only, dropoff-only, or both
        stopType: {
          type: String,
          enum: ['pickup', 'dropoff', 'both'],
          default: 'both',
        },
        // Estimated time from previous stop (in seconds)
        estimatedTimeFromPrevious: {
          type: Number,
          default: 0,
        },
        // Distance from previous stop (in meters)
        distanceFromPrevious: {
          type: Number,
          default: 0,
        },
      },
    ],
    
    // For bidirectional routes: define both directions
    directions: [
      {
        name: {
          type: String, // e.g., "Outbound" or "To Campus"
          required: true,
        },
        stops: [
          {
            stopId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Stop',
              required: true,
            },
            sequence: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
    
    // Average loop time (for loop routes) in seconds
    averageLoopTime: {
      type: Number,
      default: 1800, // 30 minutes default
    },
    
    // Operating hours
    operatingHours: {
      start: {
        type: String, // "07:00"
        default: "07:00",
      },
      end: {
        type: String, // "22:00"
        default: "22:00",
      },
    },
    
    // Frequency (minutes between shuttles, if multiple shuttles on route)
    frequency: {
      type: Number,
      default: 15, // minutes
    },
    
    // GeoJSON path (for map display)
    path: {
      type: {
        type: String,
        enum: ['LineString'],
      },
      coordinates: {
        type: [[Number]],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
RouteSchema.index({ active: 1 });
RouteSchema.index({ name: 1 });
RouteSchema.index({ shortName: 1 });
RouteSchema.index({ shuttleId: 1 });
RouteSchema.index({ 'stops.stopId': 1 });
RouteSchema.index({ path: '2dsphere' });

// Virtual: Get total number of stops
RouteSchema.virtual('totalStops').get(function() {
  return this.stops?.length || 0;
});

// Method: Get next stop after a given stop
RouteSchema.methods.getNextStop = function(currentStopId) {
  const currentIndex = this.stops.findIndex(
    s => s.stopId.toString() === currentStopId.toString()
  );
  
  if (currentIndex === -1) return null;
  
  if (this.routeType === 'loop') {
    // Loop back to start
    const nextIndex = (currentIndex + 1) % this.stops.length;
    return this.stops[nextIndex];
  } else if (this.routeType === 'linear') {
    // Stop at end
    return currentIndex < this.stops.length - 1 
      ? this.stops[currentIndex + 1] 
      : null;
  }
  
  return null;
};

// Method: Check if route serves both pickup and dropoff stops
RouteSchema.methods.servesBothStops = function(pickupStopId, dropoffStopId) {
  const pickupIndex = this.stops.findIndex(
    s => s.stopId.toString() === pickupStopId.toString()
  );
  const dropoffIndex = this.stops.findIndex(
    s => s.stopId.toString() === dropoffStopId.toString()
  );
  
  // Both stops must exist, and dropoff must come after pickup
  return pickupIndex !== -1 && dropoffIndex !== -1 && dropoffIndex > pickupIndex;
};

// Method: Calculate estimated time between two stops
RouteSchema.methods.getTimeBetweenStops = function(fromStopId, toStopId) {
  const fromIndex = this.stops.findIndex(
    s => s.stopId.toString() === fromStopId.toString()
  );
  const toIndex = this.stops.findIndex(
    s => s.stopId.toString() === toStopId.toString()
  );
  
  if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) {
    return null;
  }
  
  // Sum up estimated times between stops
  let totalTime = 0;
  for (let i = fromIndex + 1; i <= toIndex; i++) {
    totalTime += this.stops[i].estimatedTimeFromPrevious || 0;
  }
  
  return totalTime;
};

const Route = mongoose.models.Route || mongoose.model('Route', RouteSchema);

export default Route;