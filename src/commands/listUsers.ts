import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('list-users')
    .setDescription('Lister tous les utilisateurs enregistrés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('filtre')
            .setDescription('Filtrer par rôle')
            .setRequired(false)
            .addChoices(
                { name: 'Admin', value: 'admin' },
                { name: 'ESGI', value: 'esgi' },
                { name: 'Externe', value: 'externe' },
            )
    );

type UserDoc = { prenom: string; nom: string; classe: string; email: string; discordId: string; roles: string[] };

const EXTERNAL_CLASS = process.env.EXTERNAL_CLASS?.toUpperCase() ?? 'EXTERNE';

function formatUser(u: UserDoc, i: number): string {
    return `${i + 1}. **${u.prenom.toUpperCase()} ${u.nom.toUpperCase()}** [${u.classe.toUpperCase()}] — ${u.email} — <@${u.discordId}>`;
}

function buildChunks(lines: string[]): string[] {
    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
        const next = current ? current + '\n' + line : line;
        if (next.length > 2000) {
            chunks.push(current);
            current = line;
        } else {
            current = next;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const filtre = interaction.options.getString('filtre');

    if (filtre) {
        const users = await User.find({ roles: filtre }).sort({ registeredAt: 1 }) as UserDoc[];
        if (users.length === 0) {
            await interaction.editReply(`Aucun utilisateur avec le rôle **${filtre.toUpperCase()}**.`);
            return;
        }
        const lines = users.map((u, i) => formatUser(u, i));
        const chunks = buildChunks(lines);
        await interaction.editReply(chunks[0]);
        for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp({ content: chunks[i], ephemeral: true });
        }
        return;
    }

    const allUsers = await User.find().sort({ registeredAt: 1 }) as UserDoc[];
    if (allUsers.length === 0) {
        await interaction.editReply('Aucun utilisateur enregistré.');
        return;
    }

    const admins = allUsers.filter(u => u.roles?.includes('admin'));
    const externes = allUsers.filter(u =>
        !u.roles?.includes('admin') &&
        (u.roles?.includes('externe') || u.classe.toUpperCase() === EXTERNAL_CLASS)
    );
    const esgis = allUsers.filter(u =>
        !u.roles?.includes('admin') &&
        !u.roles?.includes('externe') &&
        u.classe.toUpperCase() !== EXTERNAL_CLASS
    );

    const lines: string[] = [];
    if (admins.length > 0) {
        lines.push('**── ADMIN ──**');
        lines.push(...admins.map((u, i) => formatUser(u, i)));
    }
    if (externes.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push('**── EXTERNE ──**');
        lines.push(...externes.map((u, i) => formatUser(u, i)));
    }
    if (esgis.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push('**── ESGI ──**');
        lines.push(...esgis.map((u, i) => formatUser(u, i)));
    }

    const chunks = buildChunks(lines);
    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: true });
    }
}
