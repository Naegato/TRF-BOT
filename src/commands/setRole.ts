import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';
import type { Role } from '../models/User';
import { applyRoles } from '../utils/applyRoles';
import { isAdminOrOwner } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('set-role')
    .setDescription("Modifier le rôle d'un utilisateur (gérants et adjoints uniquement)")
    .addUserOption(opt =>
        opt.setName('user').setDescription('Utilisateur cible').setRequired(true))
    .addStringOption(opt =>
        opt.setName('role')
            .setDescription('Nouveau rôle')
            .setRequired(true)
            .addChoices(
                { name: 'Externe', value: 'external' },
                { name: 'ESGI',    value: 'esgi' },
                { name: 'Gérant',  value: 'manager' },
                { name: 'Adjoint', value: 'deputy' },
            ));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

    const target  = interaction.options.getUser('user', true);
    const newRole = interaction.options.getString('role', true) as Role;

    const targetUser = db.select().from(users).where(eq(users.discordId, target.id)).get();
    if (!targetUser) {
        await interaction.reply({ content: `<@${target.id}> n'est pas inscrit(e).`, flags: MessageFlags.Ephemeral });
        return;
    }

    if (targetUser.role === newRole) {
        await interaction.reply({ content: `<@${target.id}> a déjà le rôle **${newRole}**.`, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const oldRole = targetUser.role;
    const [updated] = db.update(users).set({ role: newRole }).where(eq(users.discordId, target.id)).returning().all();

    const member = await interaction.guild!.members.fetch(target.id);
    await applyRoles(member, updated);

    await interaction.editReply(`Le rôle de <@${target.id}> a été mis à jour : **${oldRole}** → **${newRole}**.`);
}
