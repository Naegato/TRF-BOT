import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('list-users')
    .setDescription('Lister tous les utilisateurs enregistrés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const users = await User.find().sort({ registeredAt: 1 });

    if (users.length === 0) {
        await interaction.editReply('Aucun utilisateur enregistré.');
        return;
    }

    const lines = users.map((u, i) =>
        `${i + 1}. **${u.prenom.toUpperCase()} ${u.nom.toUpperCase()}** [${u.classe.toUpperCase()}] — ${u.email} — <@${u.discordId}>`
    );

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

    await interaction.editReply(chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: true });
    }
}
