import mongoose from 'mongoose';

const PingSchema = new mongoose.Schema(
  {
    shuttleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shuttle',
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    ts: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    speedKph: {
      type: Number,
      default: 0,
      min: 0,
    },
    heading: {
      type: Number,
      min: 0,
      max: 359,
    },
    accuracyM: {
      type: Number,
      min: 0,
    },
    source: {
      type: String,
      enum: ['driver_app', 'device_gateway', 'mock'],
      default: 'driver_app',
    },
    batteryPct: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
PingSchema.index({ shuttleId: 1, ts: -1 });
PingSchema.index({ ts: -1 });
PingSchema.index({ driverId: 1, ts: -1 });
PingSchema.index({ location: '2dsphere' });

// TTL index - auto-delete pings older than 30 days
PingSchema.index({ ts: 1 }, { expireAfterSeconds: 2592000 });

const Ping = mongoose.models.Ping || mongoose.model('Ping', PingSchema);

export default Ping;