import { eq, and } from 'drizzle-orm';
import { db } from '../database';
import { config } from '../schema';

export function getConfig(guildId: string, key: string): string | undefined {
    return db.select().from(config)
        .where(and(eq(config.guildId, guildId), eq(config.key, key)))
        .get()?.value;
}

export function setConfig(guildId: string, key: string, value: string): void {
    db.insert(config).values({ guildId, key, value })
        .onConflictDoUpdate({
            target: [config.guildId, config.key],
            set: { value },
        })
        .run();
}
