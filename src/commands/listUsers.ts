import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { asc } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';
import { buildNickname } from '../utils/nickname';
import { requirePermission } from '../utils/permissions';

const GROUP_ORDER = ['manager', 'deputy', 'esgi', 'external'] as const;

const GROUP_LABEL: Record<string, string> = {
    manager:  '👑 Gérants',
    deputy:   '🔰 Adjoints',
    esgi:     '🎓 ESGI',
    external: '🌐 Externes',
};

export const command = new SlashCommandBuilder()
    .setName('list-users')
    .setDescription('Lister tous les utilisateurs inscrits (gérants et adjoints uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    const allUsers = db.select().from(users).orderBy(asc(users.lastName), asc(users.firstName)).all();

    if (allUsers.length === 0) {
        await interaction.reply({ content: 'Aucun utilisateur inscrit.', flags: MessageFlags.Ephemeral });
        return;
    }

    // Group by role
    const groups = new Map<string, typeof allUsers>();
    for (const role of GROUP_ORDER) groups.set(role, []);
    for (const user of allUsers) groups.get(user.role)?.push(user);

    const embed = new EmbedBuilder()
        .setTitle('Utilisateurs inscrits')
        .setColor(0x5865f2)
        .setFooter({ text: `${allUsers.length} membre(s) au total` });

    for (const role of GROUP_ORDER) {
        const group = groups.get(role)!;
        if (group.length === 0) continue;

        const lines = group.map(u => {
            const nickname = buildNickname(u.firstName, u.lastName, u.year ?? undefined, u.track ?? undefined, u.intake ?? undefined);
            return `<@${u.discordId}> — ${nickname}`;
        });

        // Discord field value limit is 1024 chars — split into multiple fields if needed
        const chunks: string[] = [];
        let current = '';
        for (const line of lines) {
            if ((current + '\n' + line).length > 1024) {
                chunks.push(current);
                current = line;
            } else {
                current = current ? current + '\n' + line : line;
            }
        }
        if (current) chunks.push(current);

        chunks.forEach((chunk, i) => {
            embed.addFields({
                name:  i === 0 ? `${GROUP_LABEL[role]} (${group.length})` : '\u200b',
                value: chunk,
            });
        });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export const handleCommand = requirePermission('admin', handleCommandImpl);
