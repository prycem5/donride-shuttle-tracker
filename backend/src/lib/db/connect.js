import mongoose from 'mongoose';

// Helpful: print a masked version of the URI so we can verify shape quickly
function maskUri(uri) {
  if (!uri) return '(empty)';
  return uri.replace(/(\/\/)([^:]+):([^@]+)@/, '$1$2:<redacted>@');
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Set it in your .env (and in Railway) ' +
      'e.g. mongodb+srv://appuser:<ENCODED_PASSWORD>@cluster0.xxx.mongodb.net/shuttleapp?retryWrites=true&w=majority&appName=Cluster0'
    );
  }

  // Quick sanity checks users often miss
  if (!/mongodb\+srv:\/\//.test(uri)) {
    console.warn('⚠️ Using a non-srv URI. SRV URIs are recommended for Atlas.');
  }
  if (!/mongodb\.net\/[^?\/]+/.test(uri)) {
    console.warn('⚠️ Your URI does not specify a database name after .net/. Example: ...mongodb.net/shuttleapp?');
  }

  console.log('Connecting to MongoDB with URI:', maskUri(uri));

  // Optional but useful in prod; avoids heavy index builds on startup
  if (process.env.NODE_ENV === 'production') {
    mongoose.set('autoIndex', false);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // If you prefer separating DB name, you can set MONGODB_DB and uncomment:
      // dbName: process.env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // retryWrites should come from URI; no need to duplicate here
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    // Improve the error message for the common Atlas auth case
    if (String(error?.message || '').toLowerCase().includes('auth')) {
      console.error(
        '❌ Auth failed. Double-check:\n' +
        '   • Username matches Atlas DB user\n' +
        '   • Password in URI is correct AND URL-encoded (e.g., @ → %40, # → %23)\n' +
        '   • Your URI includes a DB name after .net/ (e.g., /shuttleapp)\n' +
        '   • Atlas Network Access allows your IP (or 0.0.0.0/0 for dev)\n' +
        `   • Current URI: ${maskUri(uri)}`
      );
    } else {
      console.error('❌ MongoDB connection failed:', error?.message || error);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnect error:', error);
    throw error;
  }
};
