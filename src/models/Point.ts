import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
    discordId:  { type: String, required: true },
    amount:     { type: Number, required: true, default: 0.25 },
    grantedBy:  { type: String, required: true },
    messageId:  { type: String, required: true },
    channelId:  { type: String, required: true },
    createdAt:  { type: Date, default: Date.now },
});

// Un admin ne peut accorder qu'un seul point par message
pointSchema.index({ messageId: 1, grantedBy: 1 }, { unique: true });

export const Point = mongoose.model('Point', pointSchema);
