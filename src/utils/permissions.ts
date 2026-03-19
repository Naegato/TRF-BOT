import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
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

// ─── Permission guard wrapper ─────────────────────────────────────────────────

type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

const PERM_MESSAGES: Record<'admin' | 'manager', string> = {
    admin:   "Vous n'avez pas la permission d'utiliser cette commande.",
    manager: 'Seul le **Gérant** peut utiliser cette commande.',
};

export function requirePermission(level: 'admin' | 'manager', handler: CommandHandler): CommandHandler {
    return async (interaction) => {
        const check = level === 'manager' ? isManagerOrOwner : isAdminOrOwner;
        if (!await check(interaction)) {
            await interaction.reply({ content: PERM_MESSAGES[level], flags: MessageFlags.Ephemeral });
            return;
        }
        return handler(interaction);
    };
}
