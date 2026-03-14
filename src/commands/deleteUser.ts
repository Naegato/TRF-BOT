import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import { ALL_MANAGED_ROLE_NAMES } from '../utils/ensureRoles';
import { isAdminOrOwner } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('delete-user')
    .setDescription("Supprimer le compte d'un utilisateur (gérants et adjoints uniquement)")
    .addUserOption(opt =>
        opt.setName('user').setDescription('Utilisateur à supprimer').setRequired(true));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

    const target = interaction.options.getUser('user', true);

    const targetUser = await User.findOne({ discordId: target.id });
    if (!targetUser) {
        await interaction.reply({ content: `<@${target.id}> n'est pas inscrit(e).`, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);
    if (member) {
        const rolesToRemove = member.roles.cache.filter(r => ALL_MANAGED_ROLE_NAMES.includes(r.name));
        if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove).catch(() => null);
        await member.setNickname(null).catch(() => null);
    }

    await User.deleteOne({ discordId: target.id });

    await interaction.editReply(`Le compte de <@${target.id}> a été supprimé.`);
}
