import mongoose from 'mongoose';

const StopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
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
    routeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
      },
    ],
    sequence: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for location queries
StopSchema.index({ location: '2dsphere' });
StopSchema.index({ code: 1 });
StopSchema.index({ routeIds: 1 });

const Stop = mongoose.models.Stop || mongoose.model('Stop', StopSchema);

export default Stop;