import webPush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

// Set VAPID details
webPush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const sendPushNotification = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({
      userId,
      isActive: true,
    });

    const notifications = subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      )
    );

    await Promise.all(notifications);
    console.log(`📬 Sent push notification to user ${userId}`);
  } catch (error) {
    console.error('❌ Push notification error:', error);
  }
};