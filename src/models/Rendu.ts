import mongoose from 'mongoose';
import type { Track, Intake } from './User';

export interface IRendu {
    _id:       mongoose.Types.ObjectId;
    guildId:   string;
    createdBy: string;
    createdAt: Date;
    // Optional filters — undefined means "applies to everyone"
    year?:   1 | 2 | 3 | 4 | 5;
    track?:  Track;
    intake?: Intake;
}

const renduSchema = new mongoose.Schema<IRendu>({
    guildId:   { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    year:      { type: Number, enum: [1, 2, 3, 4, 5] },
    track:     { type: String, enum: ['alternating', 'initial'] },
    intake:    { type: String, enum: ['january', 'september'] },
});

export const Rendu = mongoose.model<IRendu>('Rendu', renduSchema);
