import Stop from '../lib/db/models/Stop.js';
import Arrival from '../lib/db/models/Arrival.js';

export const getStops = async (req, res, next) => {
  try {
    const { near } = req.query;

    if (near) {
      const [lat, lng] = near.split(',').map(Number);

      const stops = await Stop.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: 5000, // 5km
          },
        },
      }).limit(10);

      return res.json({
        success: true,
        count: stops.length,
        data: stops,
      });
    }

    // Return all stops
    const stops = await Stop.find({}).sort({ name: 1 });

    res.json({
      success: true,
      count: stops.length,
      data: stops,
    });
  } catch (error) {
    next(error);
  }
};

export const getStopArrivals = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get arrivals computed within last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const arrivals = await Arrival.find({
      stopId: id,
      computedAt: { $gte: twoMinutesAgo },
    })
      .populate('shuttleId', 'label capacity')
      .sort({ etaSeconds: 1 })
      .limit(3);

    res.json({
      success: true,
      count: arrivals.length,
      data: arrivals,
    });
  } catch (error) {
    next(error);
  }
};