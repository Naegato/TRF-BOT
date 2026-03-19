import { ChatInputCommandInteraction, DiscordAPIError, MessageFlags } from 'discord.js';
import { reportError } from './reportError';

type CommandHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

export function withErrorHandling(handler: CommandHandler): CommandHandler {
    return async (interaction) => {
        try {
            await handler(interaction);
        } catch (err) {
            // 10062 = interaction token expired, 40060 = already acknowledged
            if (err instanceof DiscordAPIError && (err.code === 10062 || err.code === 40060)) return;
            try {
                const msg = '❌ Une erreur est survenue. Les administrateurs ont été notifiés.';
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
                } else if (interaction.deferred) {
                    await interaction.editReply(msg);
                }
            } catch { /* interaction may have expired */ }
            await reportError(interaction.client, err, `Commande /${interaction.commandName}`);
        }
    };
}
