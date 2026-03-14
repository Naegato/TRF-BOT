import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';

const PAGE_SIZE = 10;

export const command = new SlashCommandBuilder()
    .setName('points-history')
    .setDescription('Voir votre historique de points')
    .addIntegerOption(opt =>
        opt.setName('page').setDescription('Numéro de page (défaut : 1)').setMinValue(1));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` en premier.', flags: MessageFlags.Ephemeral });
        return;
    }

    const page  = (interaction.options.getInteger('page') ?? 1) - 1;
    const total = await Point.countDocuments({ discordId: interaction.user.id });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (page >= pages) {
        await interaction.reply({ content: `La page ${page + 1} n'existe pas. Dernière page : ${pages}.`, flags: MessageFlags.Ephemeral });
        return;
    }

    const entries = await Point.find({ discordId: interaction.user.id })
        .sort({ createdAt: -1 })
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE);

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
