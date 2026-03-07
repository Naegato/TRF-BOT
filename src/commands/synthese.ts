import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    AttachmentBuilder,
} from 'discord.js';
import ExcelJS from 'exceljs';
import { User } from '../models/User';
import { Point } from '../models/Point';
import { RENDER_DATES, getApplicableRenderDates, RenderDateConfig } from '../config/renderDates';

export const command = new SlashCommandBuilder()
    .setName('synthese')
    .setDescription('Exporter la synthèse des points OPEN')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option.setName('format')
            .setDescription('Format du fichier exporté')
            .setRequired(true)
            .addChoices(
                { name: 'JSON', value: 'json' },
                { name: 'CSV', value: 'csv' },
                { name: 'Excel', value: 'excel' },
            ),
    )
    .addStringOption(option =>
        option.setName('filiere')
            .setDescription('Filtrer par filière (ex: IW, IABD…)')
            .setRequired(false),
    )
    .addStringOption(option =>
        option.setName('statut')
            .setDescription('Filtrer par statut')
            .setRequired(false)
            .addChoices(
                { name: 'Initial', value: 'initial' },
                { name: 'Alternance', value: 'alternance' },
            ),
    );

interface SyntheseRow {
    nom: string;
    prenom: string;
    classe: string;
    filiere: string;
    rentree: string;
    statut: string;
    pointsParRendu: Record<string, number>;
    total: number;
}

function renderDateToWindowStart(index: number, sortedDates: RenderDateConfig[]): Date {
    if (index === 0) return new Date(0);
    const prevDate = new Date(sortedDates[index - 1].date);
    prevDate.setDate(prevDate.getDate() + 1);
    return prevDate;
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false });

    const format   = interaction.options.getString('format', true) as 'json' | 'csv' | 'excel';
    const filiere  = interaction.options.getString('filiere')?.toUpperCase() ?? null;
    const statut   = interaction.options.getString('statut') as 'initial' | 'alternance' | null;

    // Build user query
    const userQuery: Record<string, unknown> = { roles: 'esgi' };
    if (filiere) userQuery['filiere'] = filiere;
    if (statut)  userQuery['statut']  = statut;

    const users = await User.find(userQuery);

    if (users.length === 0) {
        await interaction.editReply('Aucun utilisateur ESGI trouvé avec ces filtres.');
        return;
    }

    const discordIds = users.map(u => u.discordId);

    // Load all proof points in one query
    const allPoints = await Point.find({ discordId: { $in: discordIds }, type: 'proof' });
    const pointsByUser = new Map<string, typeof allPoints>();
    for (const p of allPoints) {
        const list = pointsByUser.get(p.discordId) ?? [];
        list.push(p);
        pointsByUser.set(p.discordId, list);
    }

    // Sort RENDER_DATES by date for window calculation
    const sortedRenderDates = [...RENDER_DATES].sort((a, b) => a.date.localeCompare(b.date));

    const rows: SyntheseRow[] = [];

    for (const user of users) {
        const applicableRenders = getApplicableRenderDates(user);
        if (applicableRenders.length === 0) continue;

        const userPoints = pointsByUser.get(user.discordId) ?? [];
        const isResponsable = user.roles.includes('responsable');
        const isAdjoint     = user.roles.includes('adjoint');

        const pointsParRendu: Record<string, number> = {};
        let total = 0;

        for (const render of applicableRenders) {
            let pts: number;

            if (isResponsable) {
                pts = 8;
            } else if (isAdjoint) {
                pts = 6;
            } else {
                // Membre actif: sum proof points in window [prev_render+1d, render_date], cap at 4
                const renderDate  = new Date(render.date);
                renderDate.setHours(23, 59, 59, 999);

                const sortedIdx   = sortedRenderDates.findIndex(r => r.renderId === render.renderId);
                const windowStart = renderDateToWindowStart(sortedIdx, sortedRenderDates);

                const sum = userPoints
                    .filter(p => {
                        const d = new Date(p.createdAt);
                        return d >= windowStart && d <= renderDate;
                    })
                    .reduce((acc, p) => acc + p.amount, 0);

                pts = Math.min(sum, 4);
            }

            pointsParRendu[render.renderId] = pts;
            total += pts;
        }

        rows.push({
            nom: user.nom,
            prenom: user.prenom,
            classe: user.classe,
            filiere: user.filiere,
            rentree: user.rentree,
            statut: user.statut,
            pointsParRendu,
            total,
        });
    }

    if (rows.length === 0) {
        await interaction.editReply('Aucune donnée à exporter (aucun utilisateur avec des rendus applicables).');
        return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (format === 'json') {
        const jsonRows = rows.map(r => ({
            nom: r.nom,
            prenom: r.prenom,
            classe: r.classe,
            filiere: r.filiere,
            rentree: r.rentree,
            statut: r.statut,
            ...r.pointsParRendu,
            total_open: r.total,
        }));
        buffer  = Buffer.from(JSON.stringify(jsonRows, null, 2));
        fileName = `synthese_${dateStr}.json`;
        mimeType = 'application/json';

    } else if (format === 'csv') {
        const allRenderIds = RENDER_DATES.map(r => r.renderId);
        const header = ['Nom', 'Prénom', 'Classe', 'Filière', 'Rentrée', 'Statut', ...allRenderIds, 'Total OPEN'];

        const escape = (v: unknown) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const csvLines = [
            header.map(escape).join(','),
            ...rows.map(r => [
                escape(r.nom),
                escape(r.prenom),
                escape(r.classe),
                escape(r.filiere),
                escape(r.rentree),
                escape(r.statut),
                ...allRenderIds.map(id => escape(r.pointsParRendu[id] ?? '')),
                escape(r.total),
            ].join(',')),
        ];

        buffer   = Buffer.from(csvLines.join('\n'), 'utf8');
        fileName = `synthese_${dateStr}.csv`;
        mimeType = 'text/csv';

    } else {
        // Excel
        const workbook  = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Synthèse OPEN');

        const allRenderIds = RENDER_DATES.map(r => r.renderId);
        worksheet.columns = [
            { header: 'Nom',         key: 'nom',      width: 20 },
            { header: 'Prénom',      key: 'prenom',   width: 20 },
            { header: 'Classe',      key: 'classe',   width: 10 },
            { header: 'Filière',     key: 'filiere',  width: 10 },
            { header: 'Rentrée',     key: 'rentree',  width: 10 },
            { header: 'Statut',      key: 'statut',   width: 12 },
            ...allRenderIds.map(id => ({ header: id, key: id, width: 24 })),
            { header: 'Total OPEN',  key: 'total',    width: 12 },
        ];

        for (const r of rows) {
            const row: Record<string, unknown> = {
                nom:     r.nom,
                prenom:  r.prenom,
                classe:  r.classe,
                filiere: r.filiere,
                rentree: r.rentree,
                statut:  r.statut,
                total:   r.total,
            };
            for (const id of allRenderIds) {
                row[id] = r.pointsParRendu[id] ?? '';
            }
            worksheet.addRow(row);
        }

        buffer   = Buffer.from(await workbook.xlsx.writeBuffer());
        fileName = `synthese_${dateStr}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    const attachment = new AttachmentBuilder(buffer, { name: fileName, description: `Synthèse OPEN — ${rows.length} membres` });
    await interaction.editReply({ content: `Synthèse exportée (${rows.length} membres).`, files: [attachment] });

    void mimeType; // used for clarity, not needed by AttachmentBuilder
}
