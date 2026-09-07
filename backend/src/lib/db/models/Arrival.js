import mongoose from 'mongoose';

const ArrivalSchema = new mongoose.Schema({
  stopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: true,
  },
  shuttleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shuttle',
    required: true,
  },
  etaSeconds: {
    type: Number,
    required: true,
    min: 0,
  },
  computedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  confidence: {
    type: Number,
    default: 0.8,
    min: 0,
    max: 1,
  },
});

// Indexes
ArrivalSchema.index({ stopId: 1, computedAt: -1 });
ArrivalSchema.index({ shuttleId: 1, computedAt: -1 });

// TTL index - auto-delete arrivals older than 1 hour
ArrivalSchema.index({ computedAt: 1 }, { expireAfterSeconds: 3600 });

const Arrival = mongoose.models.Arrival || mongoose.model('Arrival', ArrivalSchema);

export default Arrival;