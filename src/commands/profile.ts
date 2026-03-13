import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';
import { buildNickname } from '../utils/nickname';

export const command = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your profile');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'You are not registered. Use `/register` first.', ephemeral: true });
        return;
    }

    const totalPoints = await Point.aggregate([
        { $match: { discordId: interaction.user.id } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const points = totalPoints[0]?.total ?? 0;

    const nickname = buildNickname(user.firstName, user.lastName, user.year, user.track, user.intake);

    const embed = new EmbedBuilder()
        .setTitle(nickname)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor(0x5865f2)
        .addFields(
            { name: 'First name',  value: user.firstName,  inline: true },
            { name: 'Last name',   value: user.lastName,   inline: true },
            { name: 'Role',        value: user.role,        inline: true },
        );

    if (user.role !== 'external') {
        embed.addFields(
            { name: 'Year',   value: String(user.year),  inline: true },
            { name: 'Track',  value: user.track!,         inline: true },
            { name: 'Intake', value: user.intake!,        inline: true },
        );
    }

    embed.addFields(
        { name: 'Points',      value: String(points),                                           inline: true },
        { name: 'Registered',  value: `<t:${Math.floor(user.registeredAt.getTime() / 1000)}:D>`, inline: true },
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
