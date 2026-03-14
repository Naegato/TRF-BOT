import { Client, ChannelType, TextChannel } from 'discord.js';
import { eq, and, isNull, isNotNull, lte, gt, sql } from 'drizzle-orm';
import { db } from '../database';
import { sessions, points } from '../schema';
import type { ISession } from '../models/Session';
import { CHANNEL_NAMES } from './ensureChannels';

async function getPresenceChannel(client: Client, guildId: string): Promise<TextChannel | undefined> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return undefined;
    return guild.channels.cache.find(
        c => c.name === CHANNEL_NAMES.presence && c.type === ChannelType.GuildText,
    ) as TextChannel | undefined;
}

export async function openSessionNow(client: Client, session: ISession): Promise<void> {
    db.update(sessions).set({ openedAt: new Date() }).where(eq(sessions.id, session.id)).run();

    const channel = await getPresenceChannel(client, session.guildId);
    await channel?.send('📋 Une séance est ouverte ! Utilisez `/presence` pour marquer votre présence.');
}

export async function closeSessionNow(client: Client, session: ISession): Promise<void> {
    db.update(sessions).set({ closedAt: new Date() }).where(eq(sessions.id, session.id)).run();

    const result = db.select({ count: sql<number>`count(*)` })
        .from(points)
        .where(and(eq(points.sessionId, session.id), eq(points.type, 'session')))
        .get();
    const attendeeCount = result?.count ?? 0;

    const channel = await getPresenceChannel(client, session.guildId);
    await channel?.send(`🔒 La séance est terminée. **${attendeeCount}** présence(s) enregistrée(s).`);
}

export function scheduleSessionTimers(client: Client, sessionId: number, openAt: Date, closeAt: Date): void {
    const now = Date.now();
    const openDelay  = openAt.getTime() - now;
    const closeDelay = closeAt.getTime() - now;

    const scheduleClose = () => {
        const delay = closeAt.getTime() - Date.now();
        if (delay <= 0) return;
        setTimeout(async () => {
            const s = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
            if (!s || s.closedAt) return;
            await closeSessionNow(client, s);
        }, delay);
    };

    if (openDelay > 0) {
        setTimeout(async () => {
            const s = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
            if (!s || s.openedAt) return;
            await openSessionNow(client, s);
            scheduleClose();
        }, openDelay);
    } else if (closeDelay > 0) {
        scheduleClose();
    }
}

export async function restoreScheduledSessions(client: Client): Promise<void> {
    const now = new Date();

    // Sessions pending (scheduled start in the future, not yet opened)
    const pending = db.select().from(sessions)
        .where(and(isNotNull(sessions.scheduledStart), gt(sessions.scheduledStart, now), isNull(sessions.openedAt)))
        .all();
    for (const s of pending) {
        scheduleSessionTimers(client, s.id, s.scheduledStart!, s.scheduledEnd!);
    }

    // Sessions that should have opened while bot was offline
    const missedOpen = db.select().from(sessions)
        .where(and(
            isNotNull(sessions.scheduledStart), lte(sessions.scheduledStart, now),
            isNotNull(sessions.scheduledEnd),   gt(sessions.scheduledEnd, now),
            isNull(sessions.openedAt),
        ))
        .all();
    for (const s of missedOpen) {
        await openSessionNow(client, s);
        scheduleSessionTimers(client, s.id, s.scheduledStart!, s.scheduledEnd!);
    }
}
