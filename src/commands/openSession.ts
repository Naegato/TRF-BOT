import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { Session } from '../models/Session';
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

    const openSession = await Session.findOne({
        guildId:  interaction.guildId!,
        openedAt: { $exists: true },
        closedAt: { $exists: false },
    });
    if (openSession) {
        await interaction.reply({ content: 'Une séance est déjà en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const session = await Session.create({
        guildId:  interaction.guildId!,
        openedBy: interaction.user.id,
    });

    await openSessionNow(interaction.client, session);
    await interaction.editReply('Séance ouverte.');
}
