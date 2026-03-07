import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    discordId:   { type: String, required: true, unique: true },
    nom:         { type: String, required: true },
    prenom:      { type: String, required: true },
    classe:      { type: String, required: true },
    email:       { type: String, required: true },
    roles:       { type: [String], default: [] },
    filiere:     { type: String, default: '' },
    rentree:     { type: String, enum: ['octobre', 'janvier'], default: 'octobre' },
    statut:      { type: String, enum: ['initial', 'alternance'], default: 'initial' },
    registeredAt: { type: Date, default: Date.now },
});

export interface IUser {
    discordId: string;
    nom: string;
    prenom: string;
    classe: string;
    email: string;
    roles: string[];
    filiere: string;
    rentree: 'octobre' | 'janvier';
    statut: 'initial' | 'alternance';
    registeredAt: Date;
}

export const User = mongoose.model<IUser>('User', userSchema);
