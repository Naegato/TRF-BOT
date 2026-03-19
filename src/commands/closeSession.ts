import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../database';
import { sessions } from '../schema';
import { closeSessionNow } from '../utils/sessionScheduler';
import { requirePermission } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('close-session')
    .setDescription('Fermer la séance de présence en cours (gérants et adjoints uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    const session = db.select().from(sessions)
        .where(and(eq(sessions.guildId, interaction.guildId!), isNotNull(sessions.openedAt), isNull(sessions.closedAt)))
        .get();
    if (!session) {
        await interaction.reply({ content: 'Aucune séance en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await closeSessionNow(interaction.client, session);
    await interaction.editReply('Séance fermée.');
}

export const handleCommand = requirePermission('admin', handleCommandImpl);
