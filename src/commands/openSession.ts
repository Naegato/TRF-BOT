import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../database';
import { sessions } from '../schema';
import { openSessionNow } from '../utils/sessionScheduler';
import { isAdminOrOwner } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('open-session')
    .setDescription("Ouvrir une séance de présence (gérants et adjoints uniquement)");

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

    const openSession = db.select().from(sessions)
        .where(and(eq(sessions.guildId, interaction.guildId!), isNotNull(sessions.openedAt), isNull(sessions.closedAt)))
        .get();
    if (openSession) {
        await interaction.reply({ content: 'Une séance est déjà en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const [session] = db.insert(sessions).values({
        guildId:  interaction.guildId!,
        openedBy: interaction.user.id,
    }).returning().all();

    await openSessionNow(interaction.client, session);
    await interaction.editReply('Séance ouverte.');
}
