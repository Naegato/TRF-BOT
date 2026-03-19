import { eq, ne, and, or, inArray, gt, isNotNull, gte, asc } from 'drizzle-orm';
import { db } from '../database';
import { users, sessions, points, rendus } from '../schema';
import { lastRenduForUser, MAX_POINTS } from '../utils/rendus';
import type { Track, Intake } from '../models/User';

export type RenduFilters = {
    year?:   1 | 2 | 3 | 4 | 5 | null;
    track?:  Track | null;
    intake?: Intake | null;
};

export type UserPeriodStats = {
    proofPoints:       number;
    sessionAttendance: Map<string, boolean>;
    totalRaw:          number;
    totalCapped:       number;
    max:               number;
    since:             Date | null;
};

export function createRenduRecord(guildId: string, createdBy: string, filters: RenduFilters) {
    return db.insert(rendus).values({
        guildId,
        createdBy,
        ...(filters.year   != null && { year:   filters.year }),
        ...(filters.track  != null && { track:  filters.track }),
        ...(filters.intake != null && { intake: filters.intake }),
    }).returning().get()!;
}

export function fetchUsersForRendu(filters: RenduFilters) {
    const hasFilters = filters.year != null || filters.track != null || filters.intake != null;

    const groupConditions = [
        ne(users.role, 'external' as const),
        ...(filters.year   != null ? [eq(users.year,   filters.year!)]   : []),
        ...(filters.track  != null ? [eq(users.track,  filters.track!)]  : []),
        ...(filters.intake != null ? [eq(users.intake, filters.intake!)] : []),
    ];

    const userFilter = hasFilters
        ? or(and(...groupConditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]]), inArray(users.role, ['manager', 'deputy']))
        : ne(users.role, 'external' as const);

    return db.select().from(users).where(userFilter).orderBy(asc(users.lastName), asc(users.firstName)).all();
}

export function computeUserPeriodStats(
    userList: ReturnType<typeof fetchUsersForRendu>,
    guildId: string,
    renduId: number,
): Map<string, UserPeriodStats> {
    const result = new Map<string, UserPeriodStats>();

    for (const user of userList) {
        const prev       = lastRenduForUser(user, guildId);
        const prevActual = prev && prev.id !== renduId ? prev : null;
        const since      = prevActual?.createdAt ?? null;

        const userPoints = since
            ? db.select().from(points).where(and(eq(points.discordId, user.discordId), gt(points.createdAt, since))).all()
            : db.select().from(points).where(eq(points.discordId, user.discordId)).all();

        const proofPoints = userPoints.filter(p => p.type === 'proof').reduce((sum, p) => sum + p.amount, 0);
        const sessionIds  = userPoints.filter(p => p.type === 'session').map(p => String(p.sessionId));
        const totalRaw    = userPoints.reduce((sum, p) => sum + p.amount, 0);
        const max         = MAX_POINTS[user.role];

        result.set(user.discordId, {
            proofPoints,
            sessionAttendance: new Map(sessionIds.map(id => [id, true])),
            totalRaw,
            totalCapped: Math.min(totalRaw, max),
            max,
            since,
        });
    }

    return result;
}

export function fetchSessionsForPeriod(since: Date) {
    return db.select().from(sessions)
        .where(and(isNotNull(sessions.openedAt), gte(sessions.openedAt, since)))
        .orderBy(asc(sessions.openedAt))
        .all();
}
