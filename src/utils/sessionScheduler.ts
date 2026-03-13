import { Client, ChannelType, TextChannel } from 'discord.js';
import { Session, ISession } from '../models/Session';
import { Point } from '../models/Point';
import { CHANNEL_NAMES } from './ensureChannels';

type SessionDoc = ISession & { _id: unknown; save(): Promise<unknown> };

async function getPresenceChannel(client: Client, guildId: string): Promise<TextChannel | undefined> {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return undefined;
    return guild.channels.cache.find(
        c => c.name === CHANNEL_NAMES.presence && c.type === ChannelType.GuildText,
    ) as TextChannel | undefined;
}

export async function openSessionNow(client: Client, session: SessionDoc): Promise<void> {
    session.openedAt = new Date();
    await session.save();

    const channel = await getPresenceChannel(client, session.guildId);
    await channel?.send('📋 Une séance est ouverte ! Utilisez `/presence` pour marquer votre présence.');
}

export async function closeSessionNow(client: Client, session: SessionDoc): Promise<void> {
    session.closedAt = new Date();
    await session.save();

    const attendeeCount = await Point.countDocuments({ sessionId: session._id as string, type: 'session' });
    const channel = await getPresenceChannel(client, session.guildId);
    await channel?.send(`🔒 La séance est terminée. **${attendeeCount}** présence(s) enregistrée(s).`);
}

export function scheduleSessionTimers(client: Client, sessionId: string, openAt: Date, closeAt: Date): void {
    const now = Date.now();
    const openDelay = openAt.getTime() - now;
    const closeDelay = closeAt.getTime() - now;

    const scheduleClose = () => {
        const delay = closeAt.getTime() - Date.now();
        if (delay <= 0) return;
        setTimeout(async () => {
            const s = await Session.findById(sessionId);
            if (!s || s.closedAt) return;
            await closeSessionNow(client, s as SessionDoc);
        }, delay);
    };

    if (openDelay > 0) {
        setTimeout(async () => {
            const s = await Session.findById(sessionId);
            if (!s || s.openedAt) return;
            await openSessionNow(client, s as SessionDoc);
            scheduleClose();
        }, openDelay);
    } else if (closeDelay > 0) {
        scheduleClose();
    }
}

export async function restoreScheduledSessions(client: Client): Promise<void> {
    const now = new Date();

    // Sessions pending (scheduled start in the future, not yet opened)
    const pending = await Session.find({
        scheduledStart: { $exists: true, $gt: now },
        openedAt: { $exists: false },
    });
    for (const s of pending) {
        scheduleSessionTimers(client, s._id!.toString(), s.scheduledStart!, s.scheduledEnd!);
    }

    // Sessions that should have opened while bot was offline
    const missedOpen = await Session.find({
        scheduledStart: { $exists: true, $lte: now },
        scheduledEnd:   { $exists: true, $gt: now },
        openedAt: { $exists: false },
    });
    for (const s of missedOpen) {
        await openSessionNow(client, s as SessionDoc);
        scheduleSessionTimers(client, s._id!.toString(), s.scheduledStart!, s.scheduledEnd!);
    }
}
