import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export const command = new SlashCommandBuilder()
    .setName('make-admin')
    .setDescription('Attribuer le rôle ADMIN à un utilisateur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName('utilisateur')
            .setDescription('L\'utilisateur Discord à promouvoir admin')
            .setRequired(true)
    );

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('utilisateur', true);
    const guild = interaction.guild!;

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
        await interaction.editReply(`Impossible de trouver le membre <@${target.id}> dans ce serveur.`);
        return;
    }

    const adminRole = guild.roles.cache.find(r => r.name === 'ADMIN');
    if (!adminRole) {
        await interaction.editReply('Le rôle ADMIN est introuvable sur ce serveur.');
        return;
    }

    if (member.roles.cache.has(adminRole.id)) {
        await interaction.editReply(`<@${target.id}> possède déjà le rôle ADMIN.`);
        return;
    }

    await member.roles.add(adminRole);
    await interaction.editReply(`Le rôle **ADMIN** a été attribué à <@${target.id}>.`);
}
