import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { scheduleSessionTimers } from '../utils/sessionScheduler';

// Parses "YYYY-MM-DD" + "HH:MM" as Europe/Paris local time
function parseParisDateTime(dateStr: string, timeStr: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;

    // Build a UTC date then adjust for the Paris offset at that moment
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

    // offset = difference between how Paris reads the UTC date vs the raw input
    const offsetMs = parisAsUtc.getTime() - utcDate.getTime();
    return new Date(utcDate.getTime() - offsetMs);
}

export const command = new SlashCommandBuilder()
    .setName('schedule-session')
    .setDescription('Schedule an attendance session (managers and deputies only)')
    .addStringOption(opt =>
        opt.setName('date')
            .setDescription('Date in YYYY-MM-DD format (e.g. 2026-03-16)')
            .setRequired(true))
    .addStringOption(opt =>
        opt.setName('start')
            .setDescription('Start time in HH:MM format (e.g. 14:00) — Paris time')
            .setRequired(true))
    .addStringOption(opt =>
        opt.setName('end')
            .setDescription('End time in HH:MM format (e.g. 16:00) — Paris time')
            .setRequired(true));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const caller = await User.findOne({ discordId: interaction.user.id });
    if (!caller || (caller.role !== 'manager' && caller.role !== 'deputy')) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }

    const dateStr  = interaction.options.getString('date', true).trim();
    const startStr = interaction.options.getString('start', true).trim();
    const endStr   = interaction.options.getString('end', true).trim();

    const scheduledStart = parseParisDateTime(dateStr, startStr);
    const scheduledEnd   = parseParisDateTime(dateStr, endStr);

    if (!scheduledStart || !scheduledEnd) {
        await interaction.reply({ content: 'Invalid date or time format. Use `YYYY-MM-DD` and `HH:MM`.', ephemeral: true });
        return;
    }

    if (scheduledEnd <= scheduledStart) {
        await interaction.reply({ content: 'End time must be after start time.', ephemeral: true });
        return;
    }

    if (scheduledStart <= new Date()) {
        await interaction.reply({ content: 'Start time must be in the future.', ephemeral: true });
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
        content: `Session scheduled from **${fmt(scheduledStart)}** to **${fmt(scheduledEnd)}**.`,
        ephemeral: true,
    });
}
