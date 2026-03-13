import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';

const PAGE_SIZE = 10;

export const command = new SlashCommandBuilder()
    .setName('points-history')
    .setDescription('View your points history')
    .addIntegerOption(opt =>
        opt.setName('page')
            .setDescription('Page number (default: 1)')
            .setMinValue(1));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'You are not registered. Use `/register` first.', ephemeral: true });
        return;
    }

    const page  = (interaction.options.getInteger('page') ?? 1) - 1;
    const total = await Point.countDocuments({ discordId: interaction.user.id });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (page >= pages) {
        await interaction.reply({ content: `Page ${page + 1} does not exist. Last page is ${pages}.`, ephemeral: true });
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
        return `${icon} **+${e.amount} pt** — ${timestamp} by ${grantedBy}`;
    });

    const embed = new EmbedBuilder()
        .setTitle(`Points history — ${interaction.user.displayName}`)
        .setColor(0x5865f2)
        .setDescription(lines.length > 0 ? lines.join('\n') : 'No points yet.')
        .setFooter({ text: `Page ${page + 1}/${pages} — ${total} total entries` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
