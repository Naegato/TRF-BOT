import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '../database';
import { users, points } from '../schema';
import { currentPeriodPoints } from '../utils/rendus';

export const command = new SlashCommandBuilder()
    .setName('points')
    .setDescription('Voir vos points pour la période en cours')
    .setDefaultMemberPermissions(0n);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` en premier.', flags: MessageFlags.Ephemeral });
        return;
    }

    const period = currentPeriodPoints(user, interaction.guildId!);

    const whereClause = period.since
        ? and(eq(points.discordId, interaction.user.id), gt(points.createdAt, period.since))
        : eq(points.discordId, interaction.user.id);

    const breakdown = db.select({
        type:  points.type,
        total: sql<number>`sum(${points.amount})`,
        count: sql<number>`count(*)`,
    }).from(points).where(whereClause).groupBy(points.type).all();

    const byType: Record<string, { total: number; count: number }> = {};
    for (const entry of breakdown) byType[entry.type] = { total: entry.total, count: entry.count };

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
