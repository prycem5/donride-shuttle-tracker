import jwt from 'jsonwebtoken';
import User from '../lib/db/models/User.js';
import Driver from '../lib/db/models/Driver.js';
import Route from '../lib/db/models/Route.js';
import Shuttle from '../lib/db/models/Shuttle.js';

export const driverLogin = async (req, res, next) => {
  try {
    // The Clerk middleware verified this identity. Never trust a user ID
    // supplied in the request body for issuing an application JWT.
    const clerkUserId = req.clerkAuth.userId;

    // Find user
    const user = await User.findById(clerkUserId);

    if (!user || !user.roles.includes('driver')) {
      return res.status(401).json({
        success: false,
        message: 'Driver not found',
      });
    }

    // Find driver profile with populated fields
    const driver = await Driver.findOne({ userId: clerkUserId })
      .populate('assignedShuttleId')
      .populate('currentRouteId')
      .populate('currentShuttleId');

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Driver profile not found',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        driverId: driver._id,
        role: 'driver',
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Prepare response with shift info
    const responseData = {
      token,
      driver: {
        id: driver._id,
        name: user.name,
        email: user.email,
        employeeId: driver.employeeId,
        shuttleId: driver.assignedShuttleId?._id,
        shuttleLabel: driver.assignedShuttleId?.label,
        
        currentRouteId: driver.currentRouteId?._id || null,
        currentShuttleId: driver.currentShuttleId?._id || null,
        routeName: driver.currentRouteId?.name || null,
        shuttleLabel: driver.currentShuttleId?.label || null,
        status: driver.status,
      },
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};