import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('assign-role')
    .setDescription('Attribuer ou retirer le rôle Adjoint/Responsable à un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName('utilisateur')
            .setDescription('Le membre Discord')
            .setRequired(true),
    )
    .addStringOption(option =>
        option.setName('role')
            .setDescription('Rôle à modifier')
            .setRequired(true)
            .addChoices(
                { name: 'Adjoint', value: 'adjoint' },
                { name: 'Responsable', value: 'responsable' },
            ),
    )
    .addStringOption(option =>
        option.setName('action')
            .setDescription('Ajouter ou retirer')
            .setRequired(true)
            .addChoices(
                { name: 'Ajouter', value: 'add' },
                { name: 'Retirer', value: 'remove' },
            ),
    );

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target    = interaction.options.getUser('utilisateur', true);
    const roleKey   = interaction.options.getString('role', true) as 'adjoint' | 'responsable';
    const action    = interaction.options.getString('action', true) as 'add' | 'remove';

    const user = await User.findOne({ discordId: target.id });
    if (!user) {
        await interaction.editReply(`<@${target.id}> n'est pas inscrit.`);
        return;
    }

    if (!user.roles.includes('esgi')) {
        await interaction.editReply(`<@${target.id}> n'est pas membre ESGI.`);
        return;
    }

    const guild  = interaction.guild!;
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
        await interaction.editReply(`Impossible de trouver <@${target.id}> dans ce serveur.`);
        return;
    }

    await guild.roles.fetch();

    const discordRoleName = roleKey.toUpperCase() as 'ADJOINT' | 'RESPONSABLE';
    const discordRole     = guild.roles.cache.find(r => r.name === discordRoleName);

    if (action === 'add') {
        const otherKey         = roleKey === 'adjoint' ? 'responsable' : 'adjoint';
        const otherRoleName    = otherKey.toUpperCase();
        const otherDiscordRole = guild.roles.cache.find(r => r.name === otherRoleName);

        // Remove the other role first (auto-swap)
        if (otherDiscordRole) await member.roles.remove(otherDiscordRole).catch(() => null);
        if (discordRole) await member.roles.add(discordRole).catch(() => null);

        await User.updateOne(
            { discordId: target.id },
            {
                $pull: { roles: otherKey },
                $addToSet: { roles: roleKey },
            },
        );

        await interaction.editReply(`<@${target.id}> a reçu le rôle **${discordRoleName}**.`);
    } else {
        if (discordRole) await member.roles.remove(discordRole).catch(() => null);

        await User.updateOne(
            { discordId: target.id },
            { $pull: { roles: roleKey } },
        );

        await interaction.editReply(`Le rôle **${discordRoleName}** a été retiré à <@${target.id}>.`);
    }
}
