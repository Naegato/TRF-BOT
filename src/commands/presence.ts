import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Point } from '../models/Point';

export const command = new SlashCommandBuilder()
    .setName('presence')
    .setDescription('Marquer votre présence pour la séance en cours');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` avant de pouvoir marquer votre présence.', flags: MessageFlags.Ephemeral });
        return;
    }
    if (user.role === 'external') {
        await interaction.reply({ content: 'Les membres externes ne peuvent pas marquer leur présence.', flags: MessageFlags.Ephemeral });
        return;
    }

    const session = await Session.findOne({
        guildId:  interaction.guildId!,
        openedAt: { $exists: true },
        closedAt: { $exists: false },
    });
    if (!session) {
        await interaction.reply({ content: 'Aucune séance en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        await Point.create({
            discordId: interaction.user.id,
            type:      'session',
            grantedBy: session.openedBy,
            sessionId: session._id,
        });
        await interaction.reply({ content: '✅ Votre présence a été enregistrée !', flags: MessageFlags.Ephemeral });
    } catch {
        await interaction.reply({ content: 'Vous avez déjà marqué votre présence pour cette séance.', flags: MessageFlags.Ephemeral });
    }
}
