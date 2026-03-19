import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    MessageFlags,
    TextChannel,
    PermissionFlagsBits,
} from 'discord.js';
import { isAdminOrOwner } from '../utils/permissions';
import { setRulesMessageId } from '../utils/ensureRulesMessage';
import { CHANNEL_NAMES } from '../utils/ensureChannels';

const DEFAULT_CONTENT =
    '📜 **Règlement**\n\nVeuillez lire le règlement ci-dessus et réagir avec ✅ pour accéder au serveur.';

export const command = new SlashCommandBuilder()
    .setName('send-rules')
    .setDescription('Envoyer le message de règlement dans #règlement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({
            content: "Vous n'avez pas la permission d'utiliser cette commande.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('send-rules-modal')
        .setTitle('Message de règlement')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('content')
                    .setLabel('Contenu du message')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(DEFAULT_CONTENT)
                    .setRequired(true)
                    .setMaxLength(2000),
            ),
        );

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const content = interaction.fields.getTextInputValue('content').trim();

    const channel = interaction.guild?.channels.cache.find(
        c => c.name === CHANNEL_NAMES.rules,
    ) as TextChannel | undefined;

    if (!channel) {
        await interaction.editReply(`❌ Channel \`#${CHANNEL_NAMES.rules}\` introuvable.`);
        return;
    }

    const msg = await channel.send(content);
    await msg.react('✅');
    setRulesMessageId(interaction.guildId!, msg.id);

    await interaction.editReply(`✅ Message de règlement envoyé dans <#${channel.id}>.`);
}
