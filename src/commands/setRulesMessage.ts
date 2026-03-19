import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { isGuildOwner } from '../utils/permissions';
import { setRulesMessageId } from '../utils/ensureRulesMessage';

export const command = new SlashCommandBuilder()
    .setName('set-rules-message')
    .setDescription('Définir l\'ID du message de règlement (propriétaire du serveur uniquement)')
    .addStringOption(opt =>
        opt.setName('message_id')
            .setDescription('ID du message dans #règlement (clic droit → Copier l\'identifiant)')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!isGuildOwner(interaction)) {
        await interaction.reply({
            content: 'Seul le propriétaire du serveur peut utiliser cette commande.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const messageId = interaction.options.getString('message_id', true).trim();

    if (!/^\d{17,20}$/.test(messageId)) {
        await interaction.reply({
            content: '❌ Identifiant invalide. Utilisez le clic droit → **Copier l\'identifiant** sur le message dans #règlement.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    setRulesMessageId(interaction.guildId!, messageId);

    await interaction.reply({
        content: `✅ Message de règlement mis à jour : \`${messageId}\`\nLa prochaine réaction ✅ sur ce message retirera le rôle **Temp**.`,
        flags: MessageFlags.Ephemeral,
    });
}
