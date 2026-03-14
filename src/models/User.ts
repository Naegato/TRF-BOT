import mongoose from 'mongoose';

export type Role = 'external' | 'esgi' | 'manager' | 'deputy';
export type Track = 'alternating' | 'initial';
export type Intake = 'january' | 'september';

export interface IUser {
    discordId: string;
    firstName: string;
    lastName: string;
    role: Role;
    // Required for non-external users
    year?: 1 | 2 | 3 | 4 | 5;
    track?: Track;
    intake?: Intake;
    registeredAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    discordId:  { type: String, required: true, unique: true },
    firstName:  { type: String, required: true },
    lastName:   { type: String, required: true },
    role:       { type: String, enum: ['external', 'esgi', 'manager', 'deputy'], required: true },
    year:       { type: Number, enum: [1, 2, 3, 4, 5] },
    track:      { type: String, enum: ['alternating', 'initial'] },
    intake:     { type: String, enum: ['january', 'september'] },
    registeredAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', userSchema);
