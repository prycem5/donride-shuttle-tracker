import 'dotenv/config';
import mongoose from 'mongoose';

const testConnection = async () => {
  const uri = process.env.MONGODB_URI;
  
  console.log('Testing MongoDB connection...');
  console.log('URI (masked):', uri?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Database:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

testConnection();