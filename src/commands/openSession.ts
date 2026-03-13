import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { openSessionNow } from '../utils/sessionScheduler';

export const command = new SlashCommandBuilder()
    .setName('open-session')
    .setDescription('Open an attendance session (managers and deputies only)');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const caller = await User.findOne({ discordId: interaction.user.id });
    if (!caller || (caller.role !== 'manager' && caller.role !== 'deputy')) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }

    const openSession = await Session.findOne({
        guildId: interaction.guildId!,
        openedAt: { $exists: true },
        closedAt: { $exists: false },
    });
    if (openSession) {
        await interaction.reply({ content: 'A session is already open.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const session = await Session.create({
        guildId: interaction.guildId!,
        openedBy: interaction.user.id,
    });

    await openSessionNow(interaction.client, session);
    await interaction.editReply('Session opened.');
}
