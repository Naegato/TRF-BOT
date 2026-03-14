import { Rendu, IRendu } from '../models/Rendu';
import { Point } from '../models/Point';
import type { IUser, Role } from '../models/User';

export const MAX_POINTS: Record<Role, number> = {
    esgi:     4,
    external: 4,
    deputy:   6,
    manager:  8,
};

/**
 * A rendu applies to a user when every filter present on the rendu matches the user.
 * A rendu with no filters is global and applies to everyone.
 */
export async function lastRenduForUser(user: IUser, guildId: string): Promise<IRendu | null> {
    return Rendu.findOne({
        guildId,
        $and: [
            { $or: [{ year:   { $exists: false } }, { year:   user.year }] },
            { $or: [{ track:  { $exists: false } }, { track:  user.track }] },
            { $or: [{ intake: { $exists: false } }, { intake: user.intake }] },
        ],
    }).sort({ createdAt: -1 });
}

export interface PeriodPoints {
    raw:    number;
    capped: number;
    max:    number;
    since:  Date | null;
}

export async function currentPeriodPoints(user: IUser, guildId: string): Promise<PeriodPoints> {
    const lastRendu = await lastRenduForUser(user, guildId);
    const since     = lastRendu?.createdAt ?? null;

    const dateFilter = since ? { $gt: since } : {};
    const points = await Point.find({
        discordId: user.discordId,
        createdAt: dateFilter,
    });

    const raw    = points.reduce((sum, p) => sum + p.amount, 0);
    const max    = MAX_POINTS[user.role];
    const capped = Math.min(raw, max);

    return { raw, capped, max, since };
}
