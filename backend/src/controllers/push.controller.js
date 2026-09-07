import PushSubscription from '../lib/db/models/PushSubscription.js';

export const subscribe = async (req, res, next) => {
  try {
    const { userId, subscription } = req.body;

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Subscription saved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    next(error);
  }
};
