import mongoose from 'mongoose';

const renduSchema = new mongoose.Schema({
    renderId:       { type: String, required: true, unique: true },
    processedAt:    { type: Date, default: Date.now },
    usersProcessed: { type: Number, default: 0 },
});

export const Rendu = mongoose.model('Rendu', renduSchema);
