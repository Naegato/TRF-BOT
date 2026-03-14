import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../database';
import { users, sessions, points } from '../schema';

export const command = new SlashCommandBuilder()
    .setName('presence')
    .setDescription('Marquer votre présence pour la séance en cours');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` avant de pouvoir marquer votre présence.', flags: MessageFlags.Ephemeral });
        return;
    }
    if (user.role === 'external') {
        await interaction.reply({ content: 'Les membres externes ne peuvent pas marquer leur présence.', flags: MessageFlags.Ephemeral });
        return;
    }

    const session = db.select().from(sessions)
        .where(and(eq(sessions.guildId, interaction.guildId!), isNotNull(sessions.openedAt), isNull(sessions.closedAt)))
        .get();
    if (!session) {
        await interaction.reply({ content: 'Aucune séance en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        db.insert(points).values({
            discordId: interaction.user.id,
            type:      'session',
            grantedBy: session.openedBy,
            sessionId: session.id,
        }).run();
        await interaction.reply({ content: '✅ Votre présence a été enregistrée !', flags: MessageFlags.Ephemeral });
    } catch {
        await interaction.reply({ content: 'Vous avez déjà marqué votre présence pour cette séance.', flags: MessageFlags.Ephemeral });
    }
}
