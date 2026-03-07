import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    classe: { type: String, required: true },
    email: { type: String, required: true },
    roles: { type: [String], default: [] },
    registeredAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
