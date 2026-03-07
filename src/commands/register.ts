import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('register')
    .setDescription("S'inscrire sur le serveur");

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const existing = await User.findOne({ discordId: interaction.user.id });
    if (existing) {
        await interaction.reply({ content: 'Vous êtes déjà inscrit.', ephemeral: true });
        return;
    }

    const esgiButton = new ButtonBuilder()
        .setCustomId('register-type-esgi')
        .setLabel('ESGI')
        .setStyle(ButtonStyle.Primary);

    const externeButton = new ButtonBuilder()
        .setCustomId('register-type-externe')
        .setLabel('Externe')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(esgiButton, externeButton);

    await interaction.reply({
        content: 'Êtes-vous étudiant ESGI ou externe ?',
        components: [row],
        ephemeral: true,
    });
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
    const isExterne = interaction.customId === 'register-type-externe';

    const modal = new ModalBuilder()
        .setCustomId(isExterne ? 'register-modal-externe' : 'register-modal-esgi')
        .setTitle('Inscription');

    const prenomInput = new TextInputBuilder()
        .setCustomId('prenom')
        .setLabel('Prénom')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const nomInput = new TextInputBuilder()
        .setCustomId('nom')
        .setLabel('Nom')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const emailInput = new TextInputBuilder()
        .setCustomId('email')
        .setLabel('Email')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    if (isExterne) {
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(prenomInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(nomInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
        );
    } else {
        const classeInput = new TextInputBuilder()
            .setCustomId('classe')
            .setLabel('Classe')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(prenomInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(nomInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(classeInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
        );
    }

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const existing = await User.findOne({ discordId: interaction.user.id });
    if (existing) {
        await interaction.editReply('Vous êtes déjà inscrit.');
        return;
    }

    const isExterne = interaction.customId === 'register-modal-externe';
    const prenom = interaction.fields.getTextInputValue('prenom').trim();
    const nom = interaction.fields.getTextInputValue('nom').trim();
    const email = interaction.fields.getTextInputValue('email').trim();
    const classe = isExterne
        ? (process.env.EXTERNAL_CLASS?.toUpperCase() ?? 'EXTERNE')
        : interaction.fields.getTextInputValue('classe').trim();

    const guild = interaction.guild!;
    const member = await guild.members.fetch(interaction.user.id);

    const nickname = isExterne
        ? `${prenom.toUpperCase()} ${nom.toUpperCase()}`
        : `${prenom.toUpperCase()} ${nom.toUpperCase()} [${classe.toUpperCase()}]`;

    let nicknameChanged = true;
    try {
        await member.setNickname(nickname);
    } catch {
        nicknameChanged = false;
    }

    await guild.roles.fetch();
    if (isExterne) {
        const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');
        const esgiRole = guild.roles.cache.find(r => r.name === 'ESGI');
        if (esgiRole) await member.roles.remove(esgiRole).catch(() => null);
        if (externeRole) await member.roles.add(externeRole);
    } else {
        const esgiRole = guild.roles.cache.find(r => r.name === 'ESGI');
        const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');
        if (externeRole) await member.roles.remove(externeRole).catch(() => null);
        if (esgiRole) await member.roles.add(esgiRole);
    }

    await User.create({ discordId: interaction.user.id, nom, prenom, classe, email, roles: [isExterne ? 'externe' : 'esgi'] });

    const nicknameNote = nicknameChanged ? '' : '\n⚠️ Votre surnom n\'a pas pu être modifié (propriétaire du serveur).';
    await interaction.editReply(`Inscription réussie ! Vous êtes enregistré sous le nom **${nickname}**.${nicknameNote}`);
}
