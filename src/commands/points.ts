import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';

export const command = new SlashCommandBuilder()
    .setName('points')
    .setDescription('Voir votre nombre de points');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.editReply('Vous n\'êtes pas encore inscrit. Utilisez `/register` pour vous inscrire.');
        return;
    }

    if (!user.roles?.includes('esgi')) {
        await interaction.editReply('Le système de points est réservé aux membres ESGI.');
        return;
    }

    const result = await Point.aggregate([
        { $match: { discordId: interaction.user.id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const total = result[0]?.total ?? 0;
    const count = result[0]?.count ?? 0;

    const embed = new EmbedBuilder()
        .setColor(0x206694)
        .setTitle('Mes points')
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: '⭐ Total',          value: `**${total.toFixed(2)} pts**`, inline: true },
            { name: '📸 Photos validées', value: `**${count}**`,              inline: true },
        )
        .setFooter({ text: 'Chaque réaction d\'un admin sur une de vos preuves = +0.25 pt' });

    await interaction.editReply({ embeds: [embed] });
}
