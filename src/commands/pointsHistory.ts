import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';

export const command = new SlashCommandBuilder()
    .setName('points-history')
    .setDescription('Voir l\'historique de vos points');

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

    const entries = await Point.find({ discordId: interaction.user.id }).sort({ createdAt: -1 });

    if (entries.length === 0) {
        await interaction.editReply('Vous n\'avez pas encore de points. Postez des preuves dans #preuve !');
        return;
    }

    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    const lines = entries.map((e, i) => {
        const ts = `<t:${Math.floor(new Date(e.createdAt).getTime() / 1000)}:d>`;
        const entryType = (e as { type?: string }).type;
        const renderId  = (e as { renderId?: string }).renderId;
        const label = entryType === 'auto'
            ? `Auto-attribué — rendu ${renderId ?? '?'}`
            : `validé par <@${e.grantedBy}>`;
        return `\`${String(i + 1).padStart(2, '0')}.\` **+${e.amount.toFixed(2)} pt** — ${ts} — ${label}`;
    });

    // Split into chunks of 10 entries per embed
    const PAGE_SIZE = 10;
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += PAGE_SIZE) {
        pages.push(lines.slice(i, i + PAGE_SIZE).join('\n'));
    }

    const firstEmbed = new EmbedBuilder()
        .setColor(0x206694)
        .setTitle(`Historique des points — ${total.toFixed(2)} pts au total`)
        .setDescription(pages[0])
        .setFooter({ text: `${entries.length} entrée(s)${pages.length > 1 ? ` · page 1/${pages.length}` : ''}` });

    await interaction.editReply({ embeds: [firstEmbed] });

    for (let i = 1; i < pages.length; i++) {
        const embed = new EmbedBuilder()
            .setColor(0x206694)
            .setDescription(pages[i])
            .setFooter({ text: `page ${i + 1}/${pages.length}` });
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
}
