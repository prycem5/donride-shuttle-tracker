import 'dotenv/config';
import { connectDB, disconnectDB } from '../lib/db/connect.js';
import Route from '../lib/db/models/Route.js';
import Stop from '../lib/db/models/Stop.js';
import Shuttle from '../lib/db/models/Shuttle.js';
import mongoose from 'mongoose';

const seedRoutes = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding routes...');

    // Clear existing data (optional)
    await Route.deleteMany({});
    await Stop.deleteMany({});
    await Shuttle.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Define route IDs first
    const housingRouteId = new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2a');
    const archRouteId = new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f3a');
    const canterburyRouteId = new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f4a');

    // Create stops with REAL coordinates and routeIds
    const stops = await Stop.insertMany([
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4001'),
        name: 'Walb Union',
        code: 'WALB',
        location: {
          type: 'Point',
          coordinates: [-85.108039, 41.117554] // Walb Union
        },
        routeIds: [housingRouteId, archRouteId, canterburyRouteId] // All routes pass through here
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4002'),
        name: 'Student Housing (Building H)',
        code: 'SH-H',
        location: {
          type: 'Point',
          coordinates: [-85.100966, 41.115726] // Building H
        },
        routeIds: [housingRouteId] // Only housing route
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4003'),
        name: 'Student Housing (Clubhouse)',
        code: 'SH-C',
        location: {
          type: 'Point',
          coordinates: [-85.103135, 41.114744] // Clubhouse
        },
        routeIds: [housingRouteId] // Only housing route
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4004'),
        name: 'The Arch',
        code: 'ARCH',
        location: {
          type: 'Point',
          coordinates: [-85.095998, 41.138056] // The Arch
        },
        routeIds: [archRouteId] // Only arch route
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4005'),
        name: 'Canterbury Green',
        code: 'CANT',
        location: {
          type: 'Point',
          coordinates: [-85.104809, 41.123940] // Canterbury
        },
        routeIds: [canterburyRouteId] // Only Canterbury route
      }
    ]);

    console.log('✅ Created stops:', stops.length);

    // Create shuttles - starting at Walb Union
    const shuttles = await Shuttle.insertMany([
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2b'),
        label: 'Walb Union to Student Housing',
        deviceId: 'DEVICE-001',
        capacity: 45,
        status: 'available',
        currentLocation: {
          type: 'Point',
          coordinates: [-85.108039, 41.117554] // Starting at Walb Union
        },
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f3b'),
        label: 'Walb Union to The Arch',
        deviceId: 'DEVICE-002',
        capacity: 40,
        status: 'available',
        currentLocation: {
          type: 'Point',
          coordinates: [-85.108039, 41.117554] // Starting at Walb Union
        },
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f4b'),
        label: 'Walb Union to Canterbury',
        deviceId: 'DEVICE-003',
        capacity: 50,
        status: 'available',
        currentLocation: {
          type: 'Point',
          coordinates: [-85.108039, 41.117554] // Starting at Walb Union
        },
      }
    ]);

    console.log('✅ Created shuttles:', shuttles.length);

    // Calculate distances between stops for Student Housing route
    // Walb Union to Building H: ~700m
    // Building H to Clubhouse: ~400m
    
    // Create routes WITH stops
    const routes = await Route.insertMany([
      {
        _id: housingRouteId,
        name: 'Student Housing',
        shortName: 'Housing',
        longName: 'Student Housing Shuttle',
        color: '#3B82F6',
        shuttleId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2b'),
        active: true,
        routeType: 'loop',
        stops: [
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4001'), // Walb Union
            sequence: 0,
            stopType: 'both',
            estimatedTimeFromPrevious: 0,
            distanceFromPrevious: 0
          },
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4002'), // Student Housing (Building H)
            sequence: 1,
            stopType: 'both',
            estimatedTimeFromPrevious: 240, // 4 minutes (700m at 10km/h avg)
            distanceFromPrevious: 700 // 700 meters
          },
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4003'), // Student Housing (Clubhouse)
            sequence: 2,
            stopType: 'both',
            estimatedTimeFromPrevious: 150, // 2.5 minutes (400m)
            distanceFromPrevious: 400
          }
        ],
        averageLoopTime: 900, // 15 minutes total loop
      },
      {
        _id: archRouteId,
        name: 'The Arch',
        shortName: 'Arch',
        longName: 'Shuttle to the Arch',
        color: '#EF4444',
        shuttleId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f3b'),
        active: true,
        routeType: 'loop',
        stops: [
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4001'), // Walb Union
            sequence: 0,
            stopType: 'both',
            estimatedTimeFromPrevious: 0,
            distanceFromPrevious: 0
          },
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4004'), // The Arch
            sequence: 1,
            stopType: 'both',
            estimatedTimeFromPrevious: 360, // 6 minutes (2.3km distance)
            distanceFromPrevious: 2300 // ~2.3km
          }
        ],
        averageLoopTime: 900, // 15 minutes
      },
      {
        _id: canterburyRouteId,
        name: 'Canterbury Green',
        shortName: 'Canterbury',
        longName: 'Shuttle to Canterbury Green',
        color: '#10B981',
        shuttleId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f4b'),
        active: true,
        routeType: 'loop',
        stops: [
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4001'), // Walb Union
            sequence: 0,
            stopType: 'both',
            estimatedTimeFromPrevious: 0,
            distanceFromPrevious: 0
          },
          {
            stopId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4005'), // Canterbury
            sequence: 1,
            stopType: 'both',
            estimatedTimeFromPrevious: 300, // 5 minutes (~900m)
            distanceFromPrevious: 900
          }
        ],
        averageLoopTime: 720, // 12 minutes
      }
    ]);

    console.log('✅ Created routes:', routes.length);

    // Verify routes have stops and stops have routeIds
    console.log('\n📍 Verification:');
    for (const route of routes) {
      console.log(`\n   Route: ${route.name}`);
      console.log(`   Stops configured: ${route.stops.length}`);
      route.stops.forEach((stop, idx) => {
        const stopInfo = stops.find(s => s._id.equals(stop.stopId));
        console.log(`      ${idx + 1}. ${stopInfo?.name || 'Unknown'} (Sequence ${stop.sequence})`);
        console.log(`         Location: [${stopInfo?.location.coordinates[0]}, ${stopInfo?.location.coordinates[1]}]`);
        console.log(`         Routes serving this stop: ${stopInfo?.routeIds?.length || 0}`);
      });
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Stops: ${stops.length}`);
    console.log(`   Shuttles: ${shuttles.length}`);
    console.log(`   Routes: ${routes.length}`);
    
    await disconnectDB();
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
};

seedRoutes();