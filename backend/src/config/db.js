import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: env.mongodbMaxPoolSize,
    serverSelectionTimeoutMS: 10_000
  });
  console.log('MongoDB connected');
}
