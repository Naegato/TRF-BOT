import mongoose from 'mongoose';

export type PointType = 'proof' | 'session';

export interface IPoint {
    discordId: string;
    type: PointType;
    grantedBy: string;
    amount: number;
    sessionId?: mongoose.Types.ObjectId;
    messageId?: string;
    createdAt: Date;
}

const pointSchema = new mongoose.Schema<IPoint>({
    discordId:  { type: String, required: true },
    type:       { type: String, enum: ['proof', 'session'], required: true },
    grantedBy:  { type: String, required: true },
    amount:     { type: Number, required: true, default: 1 },
    sessionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    messageId:  { type: String },
    createdAt:  { type: Date, default: Date.now },
});

// One point per proof message
pointSchema.index(
    { messageId: 1 },
    { unique: true, partialFilterExpression: { type: 'proof' } },
);

// One attendance point per user per session
pointSchema.index(
    { sessionId: 1, discordId: 1 },
    { unique: true, partialFilterExpression: { type: 'session' } },
);

export const Point = mongoose.model<IPoint>('Point', pointSchema);
