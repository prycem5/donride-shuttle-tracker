import mongoose from 'mongoose';

const DriverSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // References User._id (Clerk ID)
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    assignedShuttleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shuttle',
    },
    currentRouteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    currentShuttleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shuttle',
      default: null,
    },
    status: {
      type: String,
      enum: ['idle', 'onroute', 'break'],
      default: 'idle',
    },
    shiftStartedAt: {
      type: Date,
      default: null,
    },
    shiftEndedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
DriverSchema.index({ userId: 1 });
DriverSchema.index({ assignedShuttleId: 1 });
DriverSchema.index({ currentRouteId: 1 });
DriverSchema.index({ currentShuttleId: 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ isActive: 1 });

const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);

export default Driver;