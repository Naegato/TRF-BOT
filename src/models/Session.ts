import mongoose from 'mongoose';

export interface ISession {
    guildId: string;
    openedBy: string;
    openedAt?: Date;
    closedAt?: Date;
    scheduledStart?: Date;
    scheduledEnd?: Date;
}

const sessionSchema = new mongoose.Schema<ISession>({
    guildId:        { type: String, required: true },
    openedBy:       { type: String, required: true },
    openedAt:       { type: Date },
    closedAt:       { type: Date },
    scheduledStart: { type: Date },
    scheduledEnd:   { type: Date },
});

export const Session = mongoose.model<ISession>('Session', sessionSchema);
