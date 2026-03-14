import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import type { Role, Track, Intake } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { applyRoles } from '../utils/applyRoles';
import { isAdminOrOwner } from '../utils/permissions';

export const command = new SlashCommandBuilder()
    .setName('admin-register')
    .setDescription('Enregistrer un utilisateur manuellement (gérants et adjoints uniquement)')
    .addUserOption(opt =>
        opt.setName('user').setDescription('Utilisateur Discord à enregistrer').setRequired(true))
    .addStringOption(opt =>
        opt.setName('firstname').setDescription('Prénom').setRequired(true))
    .addStringOption(opt =>
        opt.setName('lastname').setDescription('Nom').setRequired(true))
    .addStringOption(opt =>
        opt.setName('role')
            .setDescription('Rôle')
            .setRequired(true)
            .addChoices(
                { name: 'ESGI',    value: 'esgi' },
                { name: 'Externe', value: 'external' },
                { name: 'Gérant',  value: 'manager' },
                { name: 'Adjoint', value: 'deputy' },
            ))
    .addIntegerOption(opt =>
        opt.setName('year')
            .setDescription('Année (1–5) — obligatoire si non externe')
            .addChoices(
                { name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 },
                { name: '4', value: 4 }, { name: '5', value: 5 },
            ))
    .addStringOption(opt =>
        opt.setName('track')
            .setDescription('Filière — obligatoire si non externe')
            .addChoices(
                { name: 'Alternance', value: 'alternating' },
                { name: 'Initial',    value: 'initial' },
            ))
    .addStringOption(opt =>
        opt.setName('intake')
            .setDescription('Rentrée — obligatoire si non externe')
            .addChoices(
                { name: 'Janvier',   value: 'january' },
                { name: 'Septembre', value: 'september' },
            ));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

    const target    = interaction.options.getUser('user', true);
    const firstName = interaction.options.getString('firstname', true).trim();
    const lastName  = interaction.options.getString('lastname', true).trim();
    const role      = interaction.options.getString('role', true) as Role;
    const yearRaw   = interaction.options.getInteger('year');
    const year      = yearRaw !== null ? (yearRaw as 1 | 2 | 3 | 4 | 5) : undefined;
    const track     = interaction.options.getString('track') as Track | null ?? undefined;
    const intake    = interaction.options.getString('intake') as Intake | null ?? undefined;

    if (role !== 'external') {
        const missing: string[] = [];
        if (year === undefined) missing.push('année');
        if (!track)             missing.push('filière');
        if (!intake)            missing.push('rentrée');
        if (missing.length > 0) {
            await interaction.reply({
                content: `Champs obligatoires manquants pour un utilisateur non externe : **${missing.join(', ')}**.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const existing = await User.findOne({ discordId: target.id });
    if (existing) {
        await interaction.reply({ content: `<@${target.id}> est déjà inscrit(e).`, flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const nickname = buildNickname(firstName, lastName, year, track, intake);
    const member   = await interaction.guild!.members.fetch(target.id);
    const renamed  = await member.setNickname(nickname).then(() => true).catch(() => false);
    const user     = await User.create({ discordId: target.id, firstName, lastName, role, year, track, intake });
    await applyRoles(member, user);

    const note = renamed ? '' : `\n⚠️ Le surnom n'a pas pu être défini automatiquement. À définir manuellement : \`${nickname}\``;
    await interaction.editReply(`<@${target.id}> a été inscrit(e) en tant que **${nickname}**.${note}`);
}
