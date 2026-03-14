import { ChatInputCommandInteraction } from 'discord.js';
import { User } from '../models/User';

export function isGuildOwner(interaction: ChatInputCommandInteraction): boolean {
    return interaction.guild?.ownerId === interaction.user.id;
}

/** Manager, deputy, or guild owner */
export async function isAdminOrOwner(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (isGuildOwner(interaction)) return true;
    const caller = await User.findOne({ discordId: interaction.user.id });
    return !!(caller && (caller.role === 'manager' || caller.role === 'deputy'));
}

/** Manager or guild owner only */
export async function isManagerOrOwner(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (isGuildOwner(interaction)) return true;
    const caller = await User.findOne({ discordId: interaction.user.id });
    return !!(caller && caller.role === 'manager');
}
