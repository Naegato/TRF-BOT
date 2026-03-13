import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AttachmentBuilder,
    ChannelType,
    TextChannel,
} from 'discord.js';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Point } from '../models/Point';
import { Rendu } from '../models/Rendu';
import { CHANNEL_NAMES } from '../utils/ensureChannels';
import { lastRenduForUser, MAX_POINTS } from '../utils/rendus';
import type { Track, Intake } from '../models/User';

// ─── Display helpers ─────────────────────────────────────────────────────────

const TRACK_LABEL: Record<Track, string> = {
    alternating: 'Alternance',
    initial:     'Initial',
};

const INTAKE_LABEL: Record<Intake, string> = {
    january:   'Janvier',
    september: 'Septembre',
};

// ─── CSV builder ─────────────────────────────────────────────────────────────

function cell(value: string | number): string {
    const str = String(value);
    return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
}

function row(...values: (string | number)[]): string {
    return values.map(cell).join(',');
}

// ─── Command ─────────────────────────────────────────────────────────────────

export const command = new SlashCommandBuilder()
    .setName('create-rendu')
    .setDescription('Generate a points report and send it to #rendu (managers and deputies only)')
    .addIntegerOption(opt =>
        opt.setName('year')
            .setDescription('Filter: only include users of this year')
            .addChoices(
                { name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 },
                { name: '4', value: 4 }, { name: '5', value: 5 },
            ))
    .addStringOption(opt =>
        opt.setName('track')
            .setDescription('Filter: only include users of this track')
            .addChoices(
                { name: 'Alternating', value: 'alternating' },
                { name: 'Initial',     value: 'initial' },
            ))
    .addStringOption(opt =>
        opt.setName('intake')
            .setDescription('Filter: only include users of this intake')
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

    await interaction.deferReply({ ephemeral: true });

    const filterYear   = interaction.options.getInteger('year') as 1|2|3|4|5 | null;
    const filterTrack  = interaction.options.getString('track') as Track | null;
    const filterIntake = interaction.options.getString('intake') as Intake | null;

    // ── Save rendu to DB (becomes the new period boundary) ────────────────────
    const rendu = await Rendu.create({
        guildId:   interaction.guildId!,
        createdBy: interaction.user.id,
        ...(filterYear   && { year: filterYear }),
        ...(filterTrack  && { track: filterTrack }),
        ...(filterIntake && { intake: filterIntake }),
    });

    // ── Fetch users matching the filter (externals always excluded) ───────────
    const hasFilters = filterYear || filterTrack || filterIntake;
    const groupFilter: Record<string, unknown> = { role: { $ne: 'external' } };
    if (filterYear)   groupFilter.year   = filterYear;
    if (filterTrack)  groupFilter.track  = filterTrack;
    if (filterIntake) groupFilter.intake = filterIntake;

    const users = await User.find(
        hasFilters
            // With filters: match the group OR always include managers/deputies
            ? { $or: [groupFilter, { role: { $in: ['manager', 'deputy'] } }] }
            // No filters: everyone except externals
            : { role: { $ne: 'external' } },
    ).sort({ lastName: 1, firstName: 1 });

    // ── For each user, find their period start (last rendu before this one) ───
    type UserPeriod = {
        proofPoints:        number;
        sessionAttendance:  Map<string, boolean>;
        totalRaw:           number;
        totalCapped:        number;
        max:                number;
        since:              Date | null;
    };

    const periodByUser = new Map<string, UserPeriod>();

    for (const user of users) {
        const prev = await lastRenduForUser(user, interaction.guildId!);
        // Exclude the rendu we just created (it's the boundary, not the start of this period)
        const prevActual = prev && String(prev._id) !== String(rendu._id) ? prev : null;
        const since = prevActual?.createdAt ?? null;

        const dateFilter = since ? { createdAt: { $gt: since } } : {};
        const userPoints = await Point.find({ discordId: user.discordId, ...dateFilter });

        const proofPoints = userPoints
            .filter(p => p.type === 'proof')
            .reduce((sum, p) => sum + p.amount, 0);

        const sessionIds = userPoints
            .filter(p => p.type === 'session')
            .map(p => String(p.sessionId));

        const totalRaw    = userPoints.reduce((sum, p) => sum + p.amount, 0);
        const max         = MAX_POINTS[user.role];

        periodByUser.set(user.discordId, {
            proofPoints,
            sessionAttendance: new Map(sessionIds.map(id => [id, true])),
            totalRaw,
            totalCapped: Math.min(totalRaw, max),
            max,
            since,
        });
    }

    // ── Fetch sessions in the widest period (from earliest user's last rendu) ─
    const allSinces = [...periodByUser.values()].map(p => p.since?.getTime() ?? 0);
    const minSince  = new Date(Math.min(...allSinces));

    const sessions = await Session.find({
        openedAt: { $gte: minSince },
    }).sort({ openedAt: 1 });

    const sessionIds    = sessions.map(s => String(s._id));
    const sessionLabels = sessions.map(s =>
        s.openedAt!.toLocaleDateString('fr-FR', {
            timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
        }),
    );

    // ── Build CSV ─────────────────────────────────────────────────────────────
    const lines: string[] = [
        row('Nom', 'Prénom', 'Promotion', 'Filière', 'Rentrée', ...sessionLabels, 'Points Preuve', 'Total Points', 'Points Max', 'Total OPEN'),
    ];

    for (const user of users) {
        const p = periodByUser.get(user.discordId)!;

        const attendance = sessionIds.map(sid => {
            // Only count if this session is within the user's period
            const session = sessions.find(s => String(s._id) === sid);
            if (!session || !session.openedAt) return 0;
            if (p.since && session.openedAt <= p.since) return 0;
            return p.sessionAttendance.has(sid) ? 1 : 0;
        });

        lines.push(row(
            user.lastName.toUpperCase(),
            user.firstName,
            user.role !== 'external' ? String(user.year ?? '') : '-',
            user.role !== 'external' ? TRACK_LABEL[user.track!] : '-',
            user.role !== 'external' ? INTAKE_LABEL[user.intake!] : '-',
            ...attendance,
            p.proofPoints,
            p.totalRaw,
            p.max,
            p.totalCapped,
        ));
    }

    lines.push('');
    lines.push(row('BARÈME'));
    lines.push(row('Membres actifs (ESGI/Externe)', `${MAX_POINTS.esgi} pts max`));
    lines.push(row('Adjoints',                      `${MAX_POINTS.deputy} pts max`));
    lines.push(row('Responsable',                   `${MAX_POINTS.manager} pts max`));

    const csv    = '\uFEFF' + lines.join('\r\n');
    const buffer = Buffer.from(csv, 'utf-8');

    const dateLabel  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const groupLabel = [filterYear, filterTrack, filterIntake].filter(Boolean).join('-') || 'all';
    const attachment = new AttachmentBuilder(buffer, { name: `rendu-${groupLabel}-${dateLabel}.csv` });

    // ── Send to #rendu ────────────────────────────────────────────────────────
    const renduChannel = interaction.guild!.channels.cache.find(
        c => c.name === CHANNEL_NAMES.rendu && c.type === ChannelType.GuildText,
    ) as TextChannel | undefined;

    if (!renduChannel) {
        await interaction.editReply('Channel #rendu not found. Try restarting the bot to create it.');
        return;
    }

    const filterLabel = [filterYear, filterTrack, filterIntake].filter(Boolean).join(', ') || 'all members';
    await renduChannel.send({
        content: `📊 Rendu — **${filterLabel}** — generated by <@${interaction.user.id}>`,
        files: [attachment],
    });

    await interaction.editReply(`Report sent to <#${renduChannel.id}>. Period has been reset for the targeted group.`);
}
