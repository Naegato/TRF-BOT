import { Client } from 'discord.js';
import cron from 'node-cron';
import { User } from '../models/User';
import { Point } from '../models/Point';
import { Rendu } from '../models/Rendu';
import { RENDER_DATES, getApplicableRenderDates } from '../config/renderDates';

function todayString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function processRenderDate(renderId: string): Promise<void> {
    const alreadyDone = await Rendu.findOne({ renderId });
    if (alreadyDone) {
        console.log(`[autoAwardPoints] Rendu "${renderId}" déjà traité — skip.`);
        return;
    }

    // Load ESGI users with adjoint or responsable role
    const users = await User.find({
        roles: { $in: ['adjoint', 'responsable'] },
    });

    // Filter to users for whom this renderId applies
    const eligible = users.filter(user =>
        getApplicableRenderDates(user).some(r => r.renderId === renderId),
    );

    if (eligible.length === 0) {
        console.log(`[autoAwardPoints] Rendu "${renderId}" — aucun utilisateur éligible.`);
        await Rendu.create({ renderId, usersProcessed: 0 });
        return;
    }

    const pointDocs = eligible.map(user => {
        const amount = user.roles.includes('responsable') ? 8 : 6;
        return {
            discordId: user.discordId,
            amount,
            type: 'auto',
            renderId,
            grantedBy: null,
            messageId: null,
            channelId: null,
        };
    });

    try {
        await Point.insertMany(pointDocs, { ordered: false });
    } catch (err: unknown) {
        // Ignore duplicate key errors (E11000) from the unique sparse index
        if ((err as { code?: number }).code !== 11000) {
            const writeErrors = (err as { writeErrors?: unknown[] }).writeErrors;
            if (!writeErrors) throw err;
        }
    }

    await Rendu.create({ renderId, usersProcessed: eligible.length });
    console.log(`[autoAwardPoints] Rendu "${renderId}" traité — ${eligible.length} utilisateur(s).`);
}

export function startAutoAwardCron(_client: Client): void {
    // Run daily at 08:00 (server must be in Europe/Paris or adjust the expression)
    cron.schedule('0 8 * * *', async () => {
        const today = todayString();
        console.log(`[autoAwardPoints] Vérification des rendus pour ${today}`);

        const todayConfigs = RENDER_DATES.filter(r => r.date === today);
        for (const config of todayConfigs) {
            try {
                await processRenderDate(config.renderId);
            } catch (err) {
                console.error(`[autoAwardPoints] Erreur pour "${config.renderId}":`, err);
            }
        }
    });
    console.log('[autoAwardPoints] Cron démarré (0 8 * * *).');
}
