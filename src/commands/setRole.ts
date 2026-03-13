import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { User } from '../models/User';
import type { Role } from '../models/User';
import { applyRoles } from '../utils/applyRoles';

export const command = new SlashCommandBuilder()
    .setName('set-role')
    .setDescription('Upgrade or downgrade a user\'s role (managers and deputies only)')
    .addUserOption(opt =>
        opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt =>
        opt.setName('role')
            .setDescription('New role')
            .setRequired(true)
            .addChoices(
                { name: 'External', value: 'external' },
                { name: 'ESGI',     value: 'esgi' },
                { name: 'Manager',  value: 'manager' },
                { name: 'Deputy',   value: 'deputy' },
            ));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const caller = await User.findOne({ discordId: interaction.user.id });
    if (!caller || (caller.role !== 'manager' && caller.role !== 'deputy')) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }

    const target  = interaction.options.getUser('user', true);
    const newRole = interaction.options.getString('role', true) as Role;

    const targetUser = await User.findOne({ discordId: target.id });
    if (!targetUser) {
        await interaction.reply({ content: `<@${target.id}> is not registered.`, ephemeral: true });
        return;
    }

    if (targetUser.role === newRole) {
        await interaction.reply({ content: `<@${target.id}> already has the role **${newRole}**.`, ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    await targetUser.save();

    const member = await interaction.guild!.members.fetch(target.id);
    await applyRoles(member, targetUser);

    await interaction.editReply(
        `<@${target.id}>'s role has been updated from **${oldRole}** to **${newRole}**.`,
    );
}
