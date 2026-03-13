import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction,
} from 'discord.js';
import { User } from '../models/User';
import type { Track, Intake } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { applyRoles } from '../utils/applyRoles';

export const command = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register yourself on the server');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const existing = await User.findOne({ discordId: interaction.user.id });
    if (existing) {
        await interaction.reply({ content: 'You are already registered.', ephemeral: true });
        return;
    }

    const esgiButton = new ButtonBuilder()
        .setCustomId('register:esgi')
        .setLabel('ESGI')
        .setStyle(ButtonStyle.Primary);

    const externalButton = new ButtonBuilder()
        .setCustomId('register:external')
        .setLabel('External')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(esgiButton, externalButton);

    await interaction.reply({
        content: 'Are you an ESGI student or an external member?',
        components: [row],
        ephemeral: true,
    });
}

export async function handleButton(interaction: ButtonInteraction) {
    const isExternal = interaction.customId === 'register:external';

    const modal = new ModalBuilder()
        .setCustomId(isExternal ? 'register-modal:external' : 'register-modal:esgi')
        .setTitle('Registration');

    const firstNameInput = new TextInputBuilder()
        .setCustomId('firstName')
        .setLabel('First name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const lastNameInput = new TextInputBuilder()
        .setCustomId('lastName')
        .setLabel('Last name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    if (isExternal) {
        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(firstNameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(lastNameInput),
        );
    } else {
        const yearInput = new TextInputBuilder()
            .setCustomId('year')
            .setLabel('Year (1–5)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const trackInput = new TextInputBuilder()
            .setCustomId('track')
            .setLabel('Track (alternating / initial)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const intakeInput = new TextInputBuilder()
            .setCustomId('intake')
            .setLabel('Intake (january / september)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(firstNameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(lastNameInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(yearInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(trackInput),
            new ActionRowBuilder<TextInputBuilder>().addComponents(intakeInput),
        );
    }

    await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const existing = await User.findOne({ discordId: interaction.user.id });
    if (existing) {
        await interaction.editReply('You are already registered.');
        return;
    }

    const isExternal = interaction.customId === 'register-modal:external';
    const firstName = interaction.fields.getTextInputValue('firstName').trim();
    const lastName = interaction.fields.getTextInputValue('lastName').trim();

    const member = await interaction.guild!.members.fetch(interaction.user.id);

    if (isExternal) {
        const nickname = buildNickname(firstName, lastName);
        const renamed = await member.setNickname(nickname).then(() => true).catch(() => false);
        const user = await User.create({ discordId: interaction.user.id, firstName, lastName, role: 'external' });
        await applyRoles(member, user);
        const note = renamed ? '' : `\n⚠️ Your nickname could not be changed automatically. Please set it manually to: \`${nickname}\``;
        await interaction.editReply(`Registration successful! Welcome, **${nickname}**.${note}`);
        return;
    }

    const yearRaw = interaction.fields.getTextInputValue('year').trim();
    const trackRaw = interaction.fields.getTextInputValue('track').trim().toLowerCase();
    const intakeRaw = interaction.fields.getTextInputValue('intake').trim().toLowerCase();

    const year = parseInt(yearRaw, 10);
    if (![1, 2, 3, 4, 5].includes(year)) {
        await interaction.editReply('Invalid year. Must be a number between 1 and 5.');
        return;
    }

    if (trackRaw !== 'alternating' && trackRaw !== 'initial') {
        await interaction.editReply('Invalid track. Must be **alternating** or **initial**.');
        return;
    }

    if (intakeRaw !== 'january' && intakeRaw !== 'september') {
        await interaction.editReply('Invalid intake. Must be **january** or **september**.');
        return;
    }

    const track = trackRaw as Track;
    const intake = intakeRaw as Intake;
    const nickname = buildNickname(firstName, lastName, year, track, intake);

    const renamed = await member.setNickname(nickname).then(() => true).catch(() => false);
    const user = await User.create({
        discordId: interaction.user.id,
        firstName,
        lastName,
        role: 'esgi',
        year: year as 1 | 2 | 3 | 4 | 5,
        track,
        intake,
    });
    await applyRoles(member, user);

    const note = renamed ? '' : `\n⚠️ Your nickname could not be changed automatically. Please set it manually to: \`${nickname}\``;
    await interaction.editReply(`Registration successful! Welcome, **${nickname}**.${note}`);
}
