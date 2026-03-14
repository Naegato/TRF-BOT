import { ChatInputCommandInteraction } from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';

export function isGuildOwner(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guild?.ownerId === interaction.user.id;
}

/** Manager, deputy, or guild owner */
export async function isAdminOrOwner(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (isGuildOwner(interaction)) return true;
    const caller = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    return !!(caller && (caller.role === 'manager' || caller.role === 'deputy'));
}

/** Manager or guild owner only */
export async function isManagerOrOwner(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (isGuildOwner(interaction)) return true;
    const caller = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    return !!(caller && caller.role === 'manager');
}
