import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { closeSessionNow } from '../utils/sessionScheduler';

export const command = new SlashCommandBuilder()
    .setName('close-session')
    .setDescription('Close the current attendance session (managers and deputies only)');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const caller = await User.findOne({ discordId: interaction.user.id });
    if (!caller || (caller.role !== 'manager' && caller.role !== 'deputy')) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }

    const session = await Session.findOne({
        guildId: interaction.guildId!,
        openedAt: { $exists: true },
        closedAt: { $exists: false },
    });
    if (!session) {
        await interaction.reply({ content: 'No session is currently open.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    await closeSessionNow(interaction.client, session);
    await interaction.editReply('Session closed.');
}
