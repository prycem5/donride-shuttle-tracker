import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // References User._id (Clerk ID)
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PushSubscriptionSchema.index({ userId: 1 });
PushSubscriptionSchema.index({ endpoint: 1 });
PushSubscriptionSchema.index({ isActive: 1 });

const PushSubscription = mongoose.models.PushSubscription || 
  mongoose.model('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
