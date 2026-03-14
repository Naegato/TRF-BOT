export type Role = 'external' | 'esgi' | 'manager' | 'deputy';
export type Track = 'alternating' | 'initial';
export type Intake = 'january' | 'september';

export interface IUser {
    discordId:    string;
    firstName:    string;
    lastName:     string;
    role:         Role;
    year:         number | null;
    track:        Track | null;
    intake:       Intake | null;
    registeredAt: Date;
}
