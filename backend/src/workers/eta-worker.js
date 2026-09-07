import 'dotenv/config';
import { connectDB } from '../lib/db/connect.js';
import { calculateAllActiveShuttleArrivals } from '../services/eta.service.js';

/**
 * ETA Calculator Worker
 * Runs continuously and calculates ETAs for all active shuttles
 * Update interval: every 15 seconds
 */

const UPDATE_INTERVAL = 15000; // 15 seconds

let isRunning = false;

async function runETACalculation() {
  if (isRunning) {
    console.log('⏭️  Skipping - previous calculation still running');
    return;
  }

  isRunning = true;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 ETA Calculation Worker - ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    const result = await calculateAllActiveShuttleArrivals();

    console.log('\n📊 Calculation Summary:');
    console.log(`   Shuttles Processed: ${result.shuttlesProcessed}`);
    console.log(`   Total Arrivals Updated: ${result.results.reduce((sum, r) => sum + r.arrivalsCalculated, 0)}`);
    console.log(`   Completed at: ${result.timestamp.toLocaleTimeString()}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Error in ETA calculation worker:', error);
  } finally {
    isRunning = false;
  }
}

async function startWorker() {
  try {
    console.log('🚀 Starting ETA Calculator Worker...\n');

    // Connect to database
    await connectDB();
    console.log('✅ Database connected\n');

    // Run initial calculation
    await runETACalculation();

    // Schedule periodic calculations
    setInterval(async () => {
      await runETACalculation();
    }, UPDATE_INTERVAL);

    console.log(`✅ Worker started - updating every ${UPDATE_INTERVAL / 1000} seconds\n`);
    console.log('Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the worker
startWorker();