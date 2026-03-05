import mongoose from 'mongoose';

const { MONGO_USER, MONGO_PASSWORD, MONGO_DB } = process.env;

const uri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DB}?authSource=admin`;

export async function connectDatabase(): Promise<void> {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');
}
