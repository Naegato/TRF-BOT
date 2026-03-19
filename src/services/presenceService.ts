import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../database';
import { users, sessions, points, presencePending } from '../schema';

export function getUserById(discordId: string) {
    return db.select().from(users).where(eq(users.discordId, discordId)).get() ?? null;
}

export function getOpenSession(guildId: string) {
    return db.select().from(sessions)
        .where(and(eq(sessions.guildId, guildId), isNotNull(sessions.openedAt), isNull(sessions.closedAt)))
        .get() ?? null;
}

export function hasValidatedPresence(discordId: string, sessionId: number): boolean {
    return !!db.select().from(points)
        .where(and(eq(points.discordId, discordId), eq(points.sessionId, sessionId)))
        .get();
}

export function hasPendingPresence(discordId: string, sessionId: number): boolean {
    return !!db.select().from(presencePending)
        .where(and(eq(presencePending.discordId, discordId), eq(presencePending.sessionId, sessionId)))
        .get();
}

export function createPendingPresence(discordId: string, sessionId: number, guildId: string): number {
    const result = db.insert(presencePending).values({ discordId, sessionId, guildId })
        .returning({ id: presencePending.id }).get()!;
    return result.id;
}

export function savePendingAdminMsgId(pendingId: number, adminMsgId: string): void {
    db.update(presencePending).set({ adminMsgId }).where(eq(presencePending.id, pendingId)).run();
}

export function getPendingById(pendingId: number) {
    return db.select().from(presencePending).where(eq(presencePending.id, pendingId)).get() ?? null;
}

export function getSessionById(sessionId: number) {
    return db.select().from(sessions).where(eq(sessions.id, sessionId)).get() ?? null;
}

export function approvePresence(
    pending: { id: number; discordId: string; sessionId: number },
    grantedBy: string,
): void {
    db.insert(points).values({
        discordId: pending.discordId,
        type:      'session',
        grantedBy,
        sessionId: pending.sessionId,
    }).run();
    db.delete(presencePending).where(eq(presencePending.id, pending.id)).run();
}

export function denyPresence(pendingId: number): void {
    db.delete(presencePending).where(eq(presencePending.id, pendingId)).run();
}
