import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';

export const command = new SlashCommandBuilder()
    .setName('points')
    .setDescription('View your points');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'You are not registered. Use `/register` first.', ephemeral: true });
        return;
    }

    const breakdown = await Point.aggregate([
        { $match: { discordId: interaction.user.id } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const byType: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;
    for (const entry of breakdown) {
        byType[entry._id] = { total: entry.total, count: entry.count };
        grandTotal += entry.total;
    }

    const proofEntry   = byType['proof']   ?? { total: 0, count: 0 };
    const sessionEntry = byType['session'] ?? { total: 0, count: 0 };

    const embed = new EmbedBuilder()
        .setTitle(`Points — ${interaction.user.displayName}`)
        .setColor(0x5865f2)
        .addFields(
            { name: '📸 Proof',    value: `${proofEntry.total} pt (${proofEntry.count} validated)`,      inline: true },
            { name: '📋 Sessions', value: `${sessionEntry.total} pt (${sessionEntry.count} attendance)`, inline: true },
            { name: '⭐ Total',    value: `**${grandTotal} pt**`,                                         inline: false },
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
