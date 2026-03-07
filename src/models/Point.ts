import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
    discordId:  { type: String, required: true },
    amount:     { type: Number, required: true, default: 0.25 },
    grantedBy:  { type: String, required: false, default: null },
    messageId:  { type: String, required: false, default: null },
    channelId:  { type: String, required: false, default: null },
    type:       { type: String, enum: ['proof', 'auto'], default: 'proof' },
    renderId:   { type: String, default: null },
    createdAt:  { type: Date, default: Date.now },
});

// Un admin ne peut accorder qu'un seul point par message
pointSchema.index({ messageId: 1, grantedBy: 1 }, { unique: true, sparse: true });
// Idempotence : un user ne peut recevoir qu'un auto-point par renderId
pointSchema.index({ discordId: 1, renderId: 1 }, { unique: true, sparse: true });

export const Point = mongoose.model('Point', pointSchema);
