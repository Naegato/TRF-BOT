import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { currentPeriodPoints } from '../utils/rendus';

export const command = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'You are not registered. Use `/register` first.', ephemeral: true });
        return;
    }

    const period   = await currentPeriodPoints(user, interaction.guildId!);
    const nickname = buildNickname(user.firstName, user.lastName, user.year, user.track, user.intake);

    const sinceLabel = period.since
        ? `<t:${Math.floor(period.since.getTime() / 1000)}:D>`
        : 'the beginning';

    const embed = new EmbedBuilder()
        .setTitle(nickname)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor(0x5865f2)
        .addFields(
            { name: 'First name', value: user.firstName, inline: true },
            { name: 'Last name',  value: user.lastName,  inline: true },
            { name: 'Role',       value: user.role,       inline: true },
        );

    if (user.role !== 'external') {
        embed.addFields(
            { name: 'Year',   value: String(user.year), inline: true },
            { name: 'Track',  value: user.track!,        inline: true },
            { name: 'Intake', value: user.intake!,       inline: true },
        );
    }

    embed.addFields(
        { name: '⭐ OPEN points', value: `**${period.capped}** / ${period.max} pt (since ${sinceLabel})`, inline: false },
        { name: 'Registered',    value: `<t:${Math.floor(user.registeredAt.getTime() / 1000)}:D>`,        inline: true },
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
