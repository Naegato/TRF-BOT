import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../database';
import { sessions } from '../schema';
import { closeSessionNow } from '../utils/sessionScheduler';
import { isAdminOrOwner } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('close-session')
    .setDescription('Fermer la séance de présence en cours (gérants et adjoints uniquement)');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

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
