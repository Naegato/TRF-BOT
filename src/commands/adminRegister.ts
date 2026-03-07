import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';
import { validateClasse } from '../utils/validateClasse';

export const command = new SlashCommandBuilder()
    .setName('admin-register')
    .setDescription('Inscrire un utilisateur à sa place')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option.setName('utilisateur')
            .setDescription('L\'utilisateur Discord à inscrire')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('prenom')
            .setDescription('Prénom')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('nom')
            .setDescription('Nom')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('email')
            .setDescription('Email')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('classe')
            .setDescription('Classe (non requis si externe)')
            .setRequired(false)
    )
    .addBooleanOption(option =>
        option.setName('externe')
            .setDescription('Cocher si l\'utilisateur est externe (pas de classe requise)')
            .setRequired(false),
    )
    .addStringOption(option =>
        option.setName('statut')
            .setDescription('Statut de l\'étudiant (défaut: initial)')
            .setRequired(false)
            .addChoices(
                { name: 'Initial', value: 'initial' },
                { name: 'Alternance', value: 'alternance' },
            ),
    )
    .addStringOption(option =>
        option.setName('rentree')
            .setDescription('Rentrée de l\'étudiant (défaut: octobre)')
            .setRequired(false)
            .addChoices(
                { name: 'Octobre', value: 'octobre' },
                { name: 'Janvier', value: 'janvier' },
            ),
    );

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('utilisateur', true);
    const prenom = interaction.options.getString('prenom', true).trim();
    const nom = interaction.options.getString('nom', true).trim();
    const email = interaction.options.getString('email', true).trim();
    const isExterne  = interaction.options.getBoolean('externe') ?? false;
    const classeRaw  = interaction.options.getString('classe');
    const statutRaw  = (interaction.options.getString('statut') ?? 'initial') as 'initial' | 'alternance';
    const rentreeRaw = (interaction.options.getString('rentree') ?? 'octobre') as 'octobre' | 'janvier';

    if (!isExterne && !classeRaw) {
        await interaction.editReply('Le champ **classe** est requis pour un étudiant ESGI.');
        return;
    }

    const classe  = isExterne ? (process.env.EXTERNAL_CLASS?.toUpperCase() ?? 'EXTERNE') : classeRaw!.trim().toUpperCase();
    let filiere = '';

    if (!isExterne) {
        const classeResult = validateClasse(classe);
        if (!classeResult.valid) {
            await interaction.editReply(classeResult.helpMessage);
            return;
        }
        filiere = classeResult.filiere;
    }

    const existing = await User.findOne({ discordId: target.id });
    if (existing) {
        await interaction.editReply(`<@${target.id}> est déjà inscrit.`);
        return;
    }

    const guild = interaction.guild!;
    const member = await guild.members.fetch(target.id).catch(() => null);

    if (!member) {
        await interaction.editReply(`Impossible de trouver le membre <@${target.id}> dans ce serveur.`);
        return;
    }

    const nickname = isExterne
        ? `${prenom.toUpperCase()} ${nom.toUpperCase()}`
        : `${prenom.toUpperCase()} ${nom.toUpperCase()} [${classe.toUpperCase()}]`;

    await member.setNickname(nickname).catch(() => null);

    await guild.roles.fetch();
    if (isExterne) {
        const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');
        if (externeRole) await member.roles.add(externeRole);
    } else {
        const esgiRole = guild.roles.cache.find(r => r.name === 'ESGI');
        if (esgiRole) await member.roles.add(esgiRole);
    }

    await User.create({
        discordId: target.id,
        nom, prenom, classe, email,
        filiere, rentree: rentreeRaw, statut: statutRaw,
        roles: [isExterne ? 'externe' : 'esgi'],
    });

    await interaction.editReply(`<@${target.id}> a été inscrit sous le nom **${nickname}**.`);
}
