import { eq, and, or, isNull, gt, desc } from 'drizzle-orm';
import { db } from '../database';
import { rendus, points } from '../schema';
import type { IUser, Role } from '../models/User';
import type { IRendu } from '../models/Rendu';

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
export function lastRenduForUser(user: IUser, guildId: string): IRendu | null {
    const yearFilter   = user.year   !== null ? or(isNull(rendus.year),   eq(rendus.year,   user.year))   : isNull(rendus.year);
    const trackFilter  = user.track  !== null ? or(isNull(rendus.track),  eq(rendus.track,  user.track))  : isNull(rendus.track);
    const intakeFilter = user.intake !== null ? or(isNull(rendus.intake), eq(rendus.intake, user.intake)) : isNull(rendus.intake);

    return db.select().from(rendus)
        .where(and(eq(rendus.guildId, guildId), yearFilter, trackFilter, intakeFilter))
        .orderBy(desc(rendus.createdAt))
        .limit(1)
        .get() ?? null;
}

export interface PeriodPoints {
    raw:    number;
    capped: number;
    max:    number;
    since:  Date | null;
}

export function currentPeriodPoints(user: IUser, guildId: string): PeriodPoints {
    const lastRendu = lastRenduForUser(user, guildId);
    const since     = lastRendu?.createdAt ?? null;

    const rows = since
        ? db.select().from(points).where(and(eq(points.discordId, user.discordId), gt(points.createdAt, since))).all()
        : db.select().from(points).where(eq(points.discordId, user.discordId)).all();

    const raw    = rows.reduce((sum, p) => sum + p.amount, 0);
    const max    = MAX_POINTS[user.role];
    const capped = Math.min(raw, max);

    return { raw, capped, max, since };
}
