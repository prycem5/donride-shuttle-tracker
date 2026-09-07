import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Clerk user ID
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    roles: {
      type: [String],
      enum: ['student', 'driver', 'admin'],
      default: ['student'],
      required: true,
    },
    driverProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    image: {
      type: String,
    },
  },
  {
    _id: false, // Don't auto-generate _id
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ driverProfileId: 1 });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;