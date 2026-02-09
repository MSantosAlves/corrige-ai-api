import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const connectMongo = async (): Promise<void> => {
  const uri = `${env.MONGODB_URI}/${env.MONGODB_DATABASE_NAME}`;

  if (env.ENV === 'development') {
    console.log(`[MongoDB] Connecting to ${uri}`);
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[MongoDB] Connected');
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
};
