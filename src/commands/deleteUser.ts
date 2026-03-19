import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';
import { ALL_MANAGED_ROLE_NAMES } from '../utils/ensureRoles';
import { requirePermission } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('delete-user')
    .setDescription("Supprimer le compte d'un utilisateur (gérants et adjoints uniquement)")
    .addUserOption(opt =>
        opt.setName('user').setDescription('Utilisateur à supprimer').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);

    const targetUser = db.select().from(users).where(eq(users.discordId, target.id)).get();
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

    db.delete(users).where(eq(users.discordId, target.id)).run();

    await interaction.editReply(`Le compte de <@${target.id}> a été supprimé.`);
}

export const handleCommand = requirePermission('admin', handleCommandImpl);
