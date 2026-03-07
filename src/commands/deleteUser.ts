import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('delete-user')
    .setDescription('Supprimer un utilisateur enregistré')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName('utilisateur')
            .setDescription('L\'utilisateur Discord à supprimer')
            .setRequired(true)
    );

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('utilisateur', true);
    const deleted = await User.findOneAndDelete({ discordId: target.id });

    if (!deleted) {
        await interaction.editReply(`Aucun utilisateur enregistré trouvé pour <@${target.id}>.`);
        return;
    }

    const guild = interaction.guild!;
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (member) {
        const roleNames = ['ADMIN', 'ESGI', 'EXTERNE'];
        const rolesToRemove = guild.roles.cache.filter(r => roleNames.includes(r.name));
        await member.roles.remove(rolesToRemove).catch(() => null);
        await member.setNickname(null).catch(() => null);
    }

    await interaction.editReply(`L'utilisateur **${deleted.prenom.toUpperCase()} ${deleted.nom.toUpperCase()}** (<@${target.id}>) a été supprimé.`);
}
