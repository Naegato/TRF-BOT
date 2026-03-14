import type { Track, Intake } from './User';

export interface IRendu {
    id:        number;
    guildId:   string;
    createdBy: string;
    createdAt: Date;
    year:      number | null;
    track:     Track | null;
    intake:    Intake | null;
}
