import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../database';
import { users, points } from '../schema';

const PAGE_SIZE = 10;

export const command = new SlashCommandBuilder()
    .setName('points-history')
    .setDescription('Voir votre historique de points')
    .addIntegerOption(opt =>
        opt.setName('page').setDescription('Numéro de page (défaut : 1)').setMinValue(1));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` en premier.', flags: MessageFlags.Ephemeral });
        return;
    }

    const page  = (interaction.options.getInteger('page') ?? 1) - 1;
    const total = db.select({ count: sql<number>`count(*)` }).from(points).where(eq(points.discordId, interaction.user.id)).get()?.count ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (page >= pages) {
        await interaction.reply({ content: `La page ${page + 1} n'existe pas. Dernière page : ${pages}.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const entries = db.select().from(points)
        .where(eq(points.discordId, interaction.user.id))
        .orderBy(desc(points.createdAt))
        .limit(PAGE_SIZE)
        .offset(page * PAGE_SIZE)
        .all();

    const lines = entries.map(e => {
        const icon      = e.type === 'proof' ? '📸' : '📋';
        const timestamp = `<t:${Math.floor(e.createdAt.getTime() / 1000)}:d>`;
        const grantedBy = `<@${e.grantedBy}>`;
        return `${icon} **+${e.amount} pt** — ${timestamp} par ${grantedBy}`;
    });

    const embed = new EmbedBuilder()
        .setTitle(`Historique de points — ${interaction.user.displayName}`)
        .setColor(0x5865f2)
        .setDescription(lines.length > 0 ? lines.join('\n') : 'Aucun point pour le moment.')
        .setFooter({ text: `Page ${page + 1}/${pages} — ${total} entrée(s) au total` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
