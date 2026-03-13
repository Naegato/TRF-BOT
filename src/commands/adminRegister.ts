import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { User } from '../models/User';
import type { Role, Track, Intake } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { applyRoles } from '../utils/applyRoles';

export const command = new SlashCommandBuilder()
    .setName('admin-register')
    .setDescription('Register a user manually (managers and deputies only)')
    .addUserOption(opt =>
        opt.setName('user').setDescription('Discord user to register').setRequired(true))
    .addStringOption(opt =>
        opt.setName('firstname').setDescription('First name').setRequired(true))
    .addStringOption(opt =>
        opt.setName('lastname').setDescription('Last name').setRequired(true))
    .addStringOption(opt =>
        opt.setName('role')
            .setDescription('Role')
            .setRequired(true)
            .addChoices(
                { name: 'ESGI',     value: 'esgi' },
                { name: 'External', value: 'external' },
                { name: 'Manager',  value: 'manager' },
                { name: 'Deputy',   value: 'deputy' },
            ))
    .addIntegerOption(opt =>
        opt.setName('year')
            .setDescription('Year (1–5) — required for non-external')
            .addChoices(
                { name: '1', value: 1 },
                { name: '2', value: 2 },
                { name: '3', value: 3 },
                { name: '4', value: 4 },
                { name: '5', value: 5 },
            ))
    .addStringOption(opt =>
        opt.setName('track')
            .setDescription('Track — required for non-external')
            .addChoices(
                { name: 'Alternating', value: 'alternating' },
                { name: 'Initial',     value: 'initial' },
            ))
    .addStringOption(opt =>
        opt.setName('intake')
            .setDescription('Intake — required for non-external')
            .addChoices(
                { name: 'January',   value: 'january' },
                { name: 'September', value: 'september' },
            ));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const caller = await User.findOne({ discordId: interaction.user.id });
    if (!caller || (caller.role !== 'manager' && caller.role !== 'deputy')) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
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
        if (year === undefined) missing.push('year');
        if (!track) missing.push('track');
        if (!intake) missing.push('intake');
        if (missing.length > 0) {
            await interaction.reply({
                content: `Missing required fields for a non-external user: **${missing.join(', ')}**.`,
                ephemeral: true,
            });
            return;
        }
    }

    const existing = await User.findOne({ discordId: target.id });
    if (existing) {
        await interaction.reply({ content: `<@${target.id}> is already registered.`, ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const nickname = buildNickname(firstName, lastName, year, track, intake);
    const member = await interaction.guild!.members.fetch(target.id);
    const renamed = await member.setNickname(nickname).then(() => true).catch(() => false);
    const user = await User.create({ discordId: target.id, firstName, lastName, role, year, track, intake });
    await applyRoles(member, user);

    const note = renamed ? '' : `\n⚠️ Nickname could not be changed automatically. Please set it manually to: \`${nickname}\``;
    await interaction.editReply(`<@${target.id}> has been registered as **${nickname}**.${note}`);
}
