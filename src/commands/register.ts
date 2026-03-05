import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
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

    const modal = new ModalBuilder()
        .setCustomId('register-modal')
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

    const classeInput = new TextInputBuilder()
        .setCustomId('classe')
        .setLabel('Classe')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const emailInput = new TextInputBuilder()
        .setCustomId('email')
        .setLabel('Email')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(prenomInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(nomInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(classeInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
    );

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const existing = await User.findOne({ discordId: interaction.user.id });
    if (existing) {
        await interaction.editReply('Vous êtes déjà inscrit.');
        return;
    }

    const prenom = interaction.fields.getTextInputValue('prenom').trim();
    const nom = interaction.fields.getTextInputValue('nom').trim();
    const classe = interaction.fields.getTextInputValue('classe').trim();
    const email = interaction.fields.getTextInputValue('email').trim();

    const guild = interaction.guild!;
    const member = await guild.members.fetch(interaction.user.id);

    const nickname = `${prenom.toUpperCase()} ${nom.toUpperCase()} [${classe.toUpperCase()}]`;
    await member.setNickname(nickname);

    const esgiRole = guild.roles.cache.find(r => r.name === 'ESGI');
    if (esgiRole) await member.roles.add(esgiRole);

    const externalClass = process.env.EXTERNAL_CLASS?.toUpperCase();
    if (externalClass && classe.toUpperCase() === externalClass) {
        const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');
        if (externeRole) await member.roles.add(externeRole);
    }

    await User.create({ discordId: interaction.user.id, nom, prenom, classe, email });

    await interaction.editReply(`Inscription réussie ! Vous êtes enregistré sous le nom **${nickname}**.`);
}
