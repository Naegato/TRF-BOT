import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';
import { currentPeriodPoints } from '../utils/rendus';

export const command = new SlashCommandBuilder()
    .setName('points')
    .setDescription('Voir vos points pour la période en cours');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` en premier.', flags: MessageFlags.Ephemeral });
        return;
    }

    const period = await currentPeriodPoints(user, interaction.guildId!);

    const dateFilter = period.since ? { $gt: period.since } : {};
    const breakdown  = await Point.aggregate([
        { $match: { discordId: interaction.user.id, createdAt: dateFilter } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const byType: Record<string, { total: number; count: number }> = {};
    for (const entry of breakdown) byType[entry._id] = { total: entry.total, count: entry.count };

    const proofEntry   = byType['proof']   ?? { total: 0, count: 0 };
    const sessionEntry = byType['session'] ?? { total: 0, count: 0 };

    const sinceLabel = period.since
        ? `<t:${Math.floor(period.since.getTime() / 1000)}:D>`
        : 'le début';

    const embed = new EmbedBuilder()
        .setTitle(`Points — ${interaction.user.displayName}`)
        .setColor(0x5865f2)
        .setDescription(`Période : depuis ${sinceLabel}`)
        .addFields(
            { name: '📸 Preuves',  value: `${proofEntry.total} pt (${proofEntry.count} validée(s))`,      inline: true },
            { name: '📋 Séances',  value: `${sessionEntry.total} pt (${sessionEntry.count} présence(s))`, inline: true },
            { name: '\u200b',      value: '\u200b',                                                         inline: true },
            { name: '📊 Total brut', value: `${period.raw} pt`,       inline: true },
            { name: '🏆 Maximum',    value: `${period.max} pt`,       inline: true },
            { name: '⭐ OPEN',       value: `**${period.capped} pt**`, inline: true },
        );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
