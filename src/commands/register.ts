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
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    MessageFlags,
} from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../database';
import { users } from '../schema';
import type { Track, Intake } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { applyRoles } from '../utils/applyRoles';

export const command = new SlashCommandBuilder()
    .setName('register')
    .setDescription("S'inscrire sur le serveur");

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const existing = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (existing) {
        await interaction.reply({ content: 'Vous êtes déjà inscrit(e).', flags: MessageFlags.Ephemeral });
        return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('register:esgi').setLabel('ESGI').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('register:external').setLabel('Externe').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
        content: 'Êtes-vous étudiant(e) ESGI ou membre externe ?',
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}

export async function handleButton(interaction: ButtonInteraction) {
    if (interaction.customId === 'register:external') {
        await interaction.showModal(buildNamesModal('register-modal:external'));
        return;
    }

    await interaction.update({
        content: 'Sélectionnez votre année :',
        components: [buildYearRow()],
    });
}

export async function handleSelect(interaction: StringSelectMenuInteraction) {
    const parts = interaction.customId.split(':');
    const step  = parts[1];
    const value = interaction.values[0];

    if (step === 'year') {
        await interaction.update({
            content: `Année **${value}** sélectionnée.\nSélectionnez votre filière :`,
            components: [buildTrackRow(value)],
        });
    } else if (step === 'track') {
        const year       = parts[2];
        const trackLabel = value === 'alternating' ? 'Alternance' : 'Initial';
        await interaction.update({
            content: `Filière **${trackLabel}** sélectionnée.\nSélectionnez votre rentrée :`,
            components: [buildIntakeRow(year, value)],
        });
    } else if (step === 'intake') {
        const year  = parts[2];
        const track = parts[3];
        await interaction.showModal(buildNamesModal(`register-modal:esgi:${year}:${track}:${value}`));
    }
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const existing = db.select().from(users).where(eq(users.discordId, interaction.user.id)).get();
    if (existing) {
        await interaction.editReply('Vous êtes déjà inscrit(e).');
        return;
    }

    const parts      = interaction.customId.split(':');
    const isExternal = parts[1] === 'external';
    const firstName  = interaction.fields.getTextInputValue('firstName').trim();
    const lastName   = interaction.fields.getTextInputValue('lastName').trim();
    const member     = await interaction.guild!.members.fetch(interaction.user.id);

    if (isExternal) {
        const nickname = buildNickname(firstName, lastName);
        const renamed  = await member.setNickname(nickname).then(() => true).catch(() => false);
        const [user]   = db.insert(users).values({ discordId: interaction.user.id, firstName, lastName, role: 'external' }).returning().all();
        await applyRoles(member, user);
        const note = renamed ? '' : `\n⚠️ Votre surnom n'a pas pu être défini automatiquement. Veuillez le définir manuellement : \`${nickname}\``;
        await interaction.editReply(`Inscription réussie ! Bienvenue, **${nickname}**.${note}`);
        return;
    }

    const year   = parseInt(parts[2], 10);
    const track  = parts[3] as Track;
    const intake = parts[4] as Intake;

    const nickname = buildNickname(firstName, lastName, year, track, intake);
    const renamed  = await member.setNickname(nickname).then(() => true).catch(() => false);
    const [user]   = db.insert(users).values({
        discordId: interaction.user.id, firstName, lastName,
        role: 'esgi', year, track, intake,
    }).returning().all();
    await applyRoles(member, user);

    const note = renamed ? '' : `\n⚠️ Votre surnom n'a pas pu être défini automatiquement. Veuillez le définir manuellement : \`${nickname}\``;
    await interaction.editReply(`Inscription réussie ! Bienvenue, **${nickname}**.${note}`);
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildNamesModal(customId: string): ModalBuilder {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Inscription')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId('firstName').setLabel('Prénom').setStyle(TextInputStyle.Short).setRequired(true),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId('lastName').setLabel('Nom').setStyle(TextInputStyle.Short).setRequired(true),
            ),
        );
}

function buildYearRow(): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('register-select:year')
            .setPlaceholder('Choisissez votre année')
            .addOptions([
                { label: '1ère année', value: '1' },
                { label: '2ème année', value: '2' },
                { label: '3ème année', value: '3' },
                { label: '4ème année', value: '4' },
                { label: '5ème année', value: '5' },
            ]),
    );
}

function buildTrackRow(year: string): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`register-select:track:${year}`)
            .setPlaceholder('Alternance ou initial ?')
            .addOptions([
                { label: 'Alternance', value: 'alternating' },
                { label: 'Initial',    value: 'initial' },
            ]),
    );
}

function buildIntakeRow(year: string, track: string): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`register-select:intake:${year}:${track}`)
            .setPlaceholder('Choisissez votre rentrée')
            .addOptions([
                { label: 'Janvier',   value: 'january' },
                { label: 'Septembre', value: 'september' },
            ]),
    );
}
