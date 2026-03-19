import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';
import { ALL_MANAGED_ROLE_NAMES } from '../utils/ensureRoles';

export const command = new SlashCommandBuilder()
    .setName('delete-account')
    .setDescription('Supprimer votre compte du serveur')
    .addStringOption(opt =>
        opt.setName('confirmation')
            .setDescription('Tapez "SUPPRIMER" pour confirmer')
            .setRequired(true))
    .setDefaultMemberPermissions(0n);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (!user) {
        await interaction.reply({ content: "Vous n'êtes pas inscrit(e).", flags: MessageFlags.Ephemeral });
        return;
    }

    if (interaction.options.getString('confirmation', true) !== 'SUPPRIMER') {
        await interaction.reply({ content: 'Confirmation incorrecte. Tapez exactement `SUPPRIMER` pour continuer.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Remove managed Discord roles and reset nickname
    const member = await interaction.guild!.members.fetch(interaction.user.id).catch(() => null);
    if (member) {
        const rolesToRemove = member.roles.cache.filter(r => ALL_MANAGED_ROLE_NAMES.includes(r.name));
        if (rolesToRemove.size > 0) await member.roles.remove(rolesToRemove).catch(() => null);
        await member.setNickname(null).catch(() => null);
    }

    db.delete(users).where(eq(users.discordId, interaction.user.id)).run();

    await interaction.editReply('Votre compte a été supprimé. Vous pouvez vous réinscrire avec `/register`.');
}
