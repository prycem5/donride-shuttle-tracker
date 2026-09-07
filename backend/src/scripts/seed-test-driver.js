import 'dotenv/config';
import { connectDB, disconnectDB } from '../lib/db/connect.js';
import User from '../lib/db/models/User.js';
import Driver from '../lib/db/models/Driver.js';
import mongoose from 'mongoose';

const seedTestDriver = async () => {
  try {
    await connectDB();
    console.log('🌱 Creating test driver...');

    // Create a test user (simulating Clerk user)
    const testUserId = 'user_test123driver'; // This would normally come from Clerk
    
    const user = await User.findOneAndUpdate(
      { _id: testUserId },
      {
        _id: testUserId,
        email: 'testdriver@university.edu',
        name: 'Test Driver',
        roles: ['driver'],
        image: null,
      },
      { upsert: true, new: true }
    );

    console.log('✅ Created user:', user.email);

    // Create driver profile
    const driver = await Driver.findOneAndUpdate(
      { userId: testUserId },
      {
        userId: testUserId,
        employeeId: 'EMP-TEST-001',
        assignedShuttleId: new mongoose.Types.ObjectId('60d5ec49f1b2c72b8c8e4f2b'),
        isActive: true,
        status: 'idle',
        currentRouteId: null,
        currentShuttleId: null,
        shiftStartedAt: null,
        shiftEndedAt: null,
      },
      { upsert: true, new: true }
    );

    console.log('✅ Created driver profile');
    console.log(`\n📊 Test Driver Details:`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Employee ID: ${driver.employeeId}`);
    console.log(`\n🔑 Use this Clerk User ID for testing: ${testUserId}`);
    
    await disconnectDB();
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
};

seedTestDriver();