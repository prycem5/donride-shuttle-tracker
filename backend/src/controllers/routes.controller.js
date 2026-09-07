import Route from '../lib/db/models/Route.js';
import Shuttle from '../lib/db/models/Shuttle.js';

export const getAllActiveRoutes = async (req, res, next) => {
  try {
    console.log('📍 getAllActiveRoutes controller called');
    
    const routes = await Route.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'shuttles',
          localField: 'shuttleId',
          foreignField: '_id',
          as: 'shuttle'
        }
      },
      { $unwind: '$shuttle' },
      {
        $project: {
          _id: 1,
          name: 1,
          shortName: 1,
          longName: 1,
          color: 1,
          shuttleId: 1,
          shuttleLabel: '$shuttle.label',
          active: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    console.log(`✅ Found ${routes.length} active routes`);

    res.json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    console.error('❌ Error in getAllActiveRoutes:', error);
    next(error);
  }
};