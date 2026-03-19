import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    TextChannel
} from 'discord.js';
import { CHANNEL_NAMES } from '../utils/ensureChannels';
import {
    getUserById,
    getOpenSession,
    hasValidatedPresence,
    hasPendingPresence,
    createPendingPresence,
    savePendingAdminMsgId,
    getPendingById,
    getSessionById,
    approvePresence,
    denyPresence,
} from '../services/presenceService';

export const command = new SlashCommandBuilder()
    .setName('presence')
    .setDescription('Marquer votre présence pour la séance en cours')
    .setDefaultMemberPermissions(0n);

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = getUserById(interaction.user.id);
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` avant de pouvoir marquer votre présence.', flags: MessageFlags.Ephemeral });
        return;
    }
    if (user.role === 'external') {
        await interaction.reply({ content: 'Les membres externes ne peuvent pas marquer leur présence.', flags: MessageFlags.Ephemeral });
        return;
    }

    const session = getOpenSession(interaction.guildId!);
    if (!session) {
        await interaction.reply({ content: 'Aucune séance en cours.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (hasValidatedPresence(interaction.user.id, session.id)) {
        await interaction.reply({ content: 'Votre présence a déjà été validée pour cette séance.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (hasPendingPresence(interaction.user.id, session.id)) {
        await interaction.reply({ content: '⏳ Votre présence est déjà en attente de validation.', flags: MessageFlags.Ephemeral });
        return;
    }

    const pendingId = createPendingPresence(interaction.user.id, session.id, interaction.guildId!);

    const adminChannel = interaction.guild?.channels.cache.find(
        c => c.name === CHANNEL_NAMES.adminCommands,
    ) as TextChannel | undefined;

    if (adminChannel) {
        const embed = new EmbedBuilder()
            .setTitle('Demande de présence')
            .setDescription(`<@${interaction.user.id}> (**${user.firstName} ${user.lastName}**) demande sa présence pour la séance en cours.`)
            .setColor(0xF39C12)
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`presence:approve:${pendingId}`)
                .setLabel('Valider')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`presence:deny:${pendingId}`)
                .setLabel('Refuser')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
        );

        const adminMsg = await adminChannel.send({ embeds: [embed], components: [row] });
        savePendingAdminMsgId(pendingId, adminMsg.id);
    }

    await interaction.reply({ content: '⏳ Votre demande de présence a été envoyée. En attente de validation par un administrateur.', flags: MessageFlags.Ephemeral });
}

export async function handleButton(interaction: ButtonInteraction) {
    const [, action, idStr] = interaction.customId.split(':');
    const pendingId = parseInt(idStr, 10);

    const pending = getPendingById(pendingId);
    if (!pending) {
        await interaction.update({ content: '⚠️ Cette demande n\'existe plus (déjà traitée ou expirée).', embeds: [], components: [] });
        return;
    }

    const requester   = getUserById(pending.discordId);
    const displayName = requester ? `**${requester.firstName} ${requester.lastName}**` : `<@${pending.discordId}>`;

    if (action === 'approve') {
        const session = getSessionById(pending.sessionId);
        approvePresence(pending, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('Présence validée ✅')
            .setDescription(`${displayName} — présence validée par <@${interaction.user.id}>`)
            .setColor(0x2ECC71)
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        try {
            const member = await interaction.guild?.members.fetch(pending.discordId);
            await member?.send(`✅ Ta présence pour la séance du ${session?.openedAt ? new Date(session.openedAt).toLocaleDateString('fr-FR') : 'aujourd\'hui'} a été validée !`);
        } catch { /* DMs may be closed */ }

    } else {
        denyPresence(pendingId);

        const embed = new EmbedBuilder()
            .setTitle('Présence refusée ❌')
            .setDescription(`${displayName} — présence refusée par <@${interaction.user.id}>`)
            .setColor(0xE74C3C)
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });

        try {
            const member = await interaction.guild?.members.fetch(pending.discordId);
            await member?.send(`❌ Ta demande de présence a été refusée par un administrateur.`);
        } catch { /* DMs may be closed */ }
    }
}
