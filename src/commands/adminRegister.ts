import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { User } from '../models/User';

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
        option.setName('classe')
            .setDescription('Classe')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('email')
            .setDescription('Email')
            .setRequired(true)
    );

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('utilisateur', true);
    const prenom = interaction.options.getString('prenom', true).trim();
    const nom = interaction.options.getString('nom', true).trim();
    const classe = interaction.options.getString('classe', true).trim();
    const email = interaction.options.getString('email', true).trim();

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

    const nickname = `${prenom.toUpperCase()} ${nom.toUpperCase()} [${classe.toUpperCase()}]`;
    await member.setNickname(nickname).catch(() => null);

    await guild.roles.fetch();
    const esgiRole = guild.roles.cache.find(r => r.name === 'ESGI');
    if (esgiRole) await member.roles.add(esgiRole);

    const externalClass = process.env.EXTERNAL_CLASS?.toUpperCase();
    if (externalClass && classe.toUpperCase() === externalClass) {
        const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');
        if (externeRole) await member.roles.add(externeRole);
    }

    await User.create({ discordId: target.id, nom, prenom, classe, email });

    await interaction.editReply(`<@${target.id}> a été inscrit sous le nom **${nickname}**.`);
}
