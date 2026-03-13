import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { Session } from '../models/Session';
import { scheduleSessionTimers } from '../utils/sessionScheduler';
import { isAdminOrOwner } from '../utils/permissions';

function parseParisDateTime(dateStr: string, timeStr: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;

    const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
    if (isNaN(utcDate.getTime())) return null;

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(utcDate);

    const p: Record<string, string> = {};
    for (const { type, value } of parts) p[type] = value;

    const parisAsUtc = new Date(
        `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}Z`,
    );

    return new Date(utcDate.getTime() - (parisAsUtc.getTime() - utcDate.getTime()));
}

export const command = new SlashCommandBuilder()
    .setName('schedule-session')
    .setDescription('Planifier une séance de présence (gérants et adjoints uniquement)')
    .addStringOption(opt =>
        opt.setName('date').setDescription('Date au format JJJJ-MM-DD (ex: 2026-03-16)').setRequired(true))
    .addStringOption(opt =>
        opt.setName('start').setDescription('Heure de début HH:MM (ex: 14:00) — heure de Paris').setRequired(true))
    .addStringOption(opt =>
        opt.setName('end').setDescription('Heure de fin HH:MM (ex: 16:00) — heure de Paris').setRequired(true));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isAdminOrOwner(interaction)) {
        await interaction.reply({ content: "Vous n'avez pas la permission d'utiliser cette commande.", flags: MessageFlags.Ephemeral });
        return;
    }

    const dateStr  = interaction.options.getString('date', true).trim();
    const startStr = interaction.options.getString('start', true).trim();
    const endStr   = interaction.options.getString('end', true).trim();

    const scheduledStart = parseParisDateTime(dateStr, startStr);
    const scheduledEnd   = parseParisDateTime(dateStr, endStr);

    if (!scheduledStart || !scheduledEnd) {
        await interaction.reply({ content: 'Format de date ou heure invalide. Utilisez `AAAA-MM-JJ` et `HH:MM`.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (scheduledEnd <= scheduledStart) {
        await interaction.reply({ content: "L'heure de fin doit être après l'heure de début.", flags: MessageFlags.Ephemeral });
        return;
    }

    if (scheduledStart <= new Date()) {
        await interaction.reply({ content: "L'heure de début doit être dans le futur.", flags: MessageFlags.Ephemeral });
        return;
    }

    const session = await Session.create({
        guildId:        interaction.guildId!,
        openedBy:       interaction.user.id,
        scheduledStart,
        scheduledEnd,
    });

    scheduleSessionTimers(interaction.client, session._id!.toString(), scheduledStart, scheduledEnd);

    const fmt = (d: Date) => d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' });
    await interaction.reply({
        content: `Séance planifiée du **${fmt(scheduledStart)}** au **${fmt(scheduledEnd)}**.`,
        flags: MessageFlags.Ephemeral,
    });
}
