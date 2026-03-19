import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AttachmentBuilder,
    ChannelType,
    TextChannel,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord.js';
import { CHANNEL_NAMES } from '../utils/ensureChannels';
import { MAX_POINTS } from '../utils/rendus';
import { requirePermission } from '../utils/permissions';
import {
    createRenduRecord,
    fetchUsersForRendu,
    computeUserPeriodStats,
    fetchSessionsForPeriod,
} from '../services/renduService';
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
    .setDescription('Générer un rapport de points et l\'envoyer dans #rendu (gérants et adjoints uniquement)')
    .addIntegerOption(opt =>
        opt.setName('year')
            .setDescription('Filtre : inclure uniquement les utilisateurs de cette année')
            .addChoices(
                { name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 },
                { name: '4', value: 4 }, { name: '5', value: 5 },
            ))
    .addStringOption(opt =>
        opt.setName('track')
            .setDescription('Filtre : inclure uniquement les utilisateurs de cette filière')
            .addChoices(
                { name: 'Alternance', value: 'alternating' },
                { name: 'Initial',    value: 'initial' },
            ))
    .addStringOption(opt =>
        opt.setName('intake')
            .setDescription('Filtre : inclure uniquement les utilisateurs de cette rentrée')
            .addChoices(
                { name: 'Janvier',   value: 'january' },
                { name: 'Septembre', value: 'september' },
            ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const filterYear   = interaction.options.getInteger('year') as 1 | 2 | 3 | 4 | 5 | null;
    const filterTrack  = interaction.options.getString('track') as Track | null;
    const filterIntake = interaction.options.getString('intake') as Intake | null;

    const filters = { year: filterYear, track: filterTrack, intake: filterIntake };

    // ── Save rendu to DB (becomes the new period boundary) ────────────────────
    const rendu = createRenduRecord(interaction.guildId!, interaction.user.id, filters);

    // ── Fetch users matching the filter ───────────────────────────────────────
    const userList = fetchUsersForRendu(filters);

    // ── Compute period stats per user ─────────────────────────────────────────
    const periodByUser = computeUserPeriodStats(userList, interaction.guildId!, rendu.id);

    // ── Fetch sessions in the widest period ───────────────────────────────────
    const allSinces = [...periodByUser.values()].map(p => p.since?.getTime() ?? 0);
    const minSince  = new Date(Math.min(...allSinces));

    const sessionList = fetchSessionsForPeriod(minSince);
    const sessionIds    = sessionList.map(s => String(s.id));
    const sessionLabels = sessionList.map(s =>
        s.openedAt!.toLocaleDateString('fr-FR', {
            timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
        }),
    );

    // ── Build CSV ─────────────────────────────────────────────────────────────
    const lines: string[] = [
        row('Nom', 'Prénom', 'Promotion', 'Filière', 'Rentrée', ...sessionLabels, 'Points Preuve', 'Total Points', 'Points Max', 'Total OPEN'),
    ];

    for (const user of userList) {
        const p = periodByUser.get(user.discordId)!;

        const attendance = sessionIds.map(sid => {
            const session = sessionList.find(s => String(s.id) === sid);
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
        await interaction.editReply('Canal #rendu introuvable. Redémarrez le bot pour le recréer.');
        return;
    }

    const filterLabel = [filterYear, filterTrack, filterIntake].filter(Boolean).join(', ') || 'tous les membres';
    await renduChannel.send({
        content: `📊 Rendu — **${filterLabel}** — généré par <@${interaction.user.id}>`,
        files: [attachment],
    });

    await interaction.editReply(`Rapport envoyé dans <#${renduChannel.id}>. La période a été réinitialisée pour le groupe ciblé.`);
}

export const handleCommand = requirePermission('admin', handleCommandImpl);
