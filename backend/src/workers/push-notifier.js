import cron from 'node-cron';
import { connectDB } from '../config/database.js';
import Arrival from '../models/Arrival.js';
import { sendPushNotification } from '../services/push.service.js';

// Run every 10 seconds
cron.schedule('*/10 * * * * *', async () => {
  try {
    // Find arrivals that are ~3 minutes away (between 2:30 and 3:30 minutes)
    const arrivals = await Arrival.find({
      etaSeconds: { $gte: 150, $lte: 210 }, // 2.5 to 3.5 minutes
      computedAt: { $gte: new Date(Date.now() - 30000) }, // Computed in last 30 seconds
    })
      .populate('shuttleId', 'label')
      .populate('stopId', 'name');

    for (const arrival of arrivals) {
      // Send push notification to users subscribed to this stop
      // For now, we'll send to all users (you can filter by stop later)
      
      const payload = {
        title: 'Shuttle Arriving Soon',
        body: `${arrival.shuttleId.label} arriving at ${arrival.stopId.name} in ~3 minutes`,
        icon: '/icons/icon-192x192.png',
        data: {
          stopId: arrival.stopId._id.toString(),
          shuttleId: arrival.shuttleId._id.toString(),
          url: `/stops/${arrival.stopId._id}`,
        },
      };

      // Here you would get users who have subscribed to this stop
      // For now, this is a placeholder
      console.log(`📬 Would send notification: ${payload.body}`);
    }
  } catch (error) {
    console.error('❌ Push notification worker error:', error);
  }
});

console.log('🔔 Push notification worker started');

// Connect to database
connectDB();