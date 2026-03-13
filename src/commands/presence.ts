import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Point } from '../models/Point';
import { CHANNEL_NAMES } from '../utils/ensureChannels';

export const command = new SlashCommandBuilder()
    .setName('presence')
    .setDescription('Mark your attendance for the current session');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel;
    if (!channel || !('name' in channel) || channel.name !== CHANNEL_NAMES.presence) {
        await interaction.reply({
            content: `This command can only be used in <#${
                interaction.guild!.channels.cache.find(
                    c => c.name === CHANNEL_NAMES.presence && c.type === ChannelType.GuildText,
                )?.id ?? CHANNEL_NAMES.presence
            }>.`,
            ephemeral: true,
        });
        return;
    }

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'You must register first using `/register`.', ephemeral: true });
        return;
    }
    if (user.role === 'external') {
        await interaction.reply({ content: 'External members cannot mark attendance.', ephemeral: true });
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

    try {
        await Point.create({
            discordId: interaction.user.id,
            type: 'session',
            grantedBy: session.openedBy,
            sessionId: session._id,
        });
        await interaction.reply({ content: '✅ Your attendance has been recorded!', ephemeral: true });
    } catch {
        await interaction.reply({ content: 'You have already marked your attendance for this session.', ephemeral: true });
    }
}
