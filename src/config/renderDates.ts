import { validateClasse } from '../utils/validateClasse';
import type { IUser } from '../models/User';

export interface ClassGroupMatcher {
    years?: number[];
    statut?: 'initial' | 'alternance';
    rentree?: 'octobre' | 'janvier';
    allYears?: boolean;
}

export interface RenderDateConfig {
    renderId: string;
    date: string; // 'YYYY-MM-DD'
    matcher: ClassGroupMatcher;
    label: string;
}

export const RENDER_DATES: RenderDateConfig[] = [
    {
        renderId: '2026-01-27-initial-oct',
        date: '2026-01-27',
        matcher: { years: [1, 2], statut: 'initial', rentree: 'octobre' },
        label: '27 jan. 2026 (1ère/2ème initial oct.)',
    },
    {
        renderId: '2026-02-15-alternance',
        date: '2026-02-15',
        matcher: { years: [1, 2], statut: 'alternance' },
        label: '15 fév. 2026 (1ère/2ème alternance)',
    },
    {
        renderId: '2026-03-09-alternance',
        date: '2026-03-09',
        matcher: { years: [3, 4, 5], statut: 'alternance' },
        label: '09 mars 2026 (3ème-5ème alternance)',
    },
    {
        renderId: '2026-03-30-janvier',
        date: '2026-03-30',
        matcher: { years: [1], statut: 'initial', rentree: 'janvier' },
        label: '30 mars 2026 (1ère jan.)',
    },
    {
        renderId: '2026-04-27-initial-oct',
        date: '2026-04-27',
        matcher: { years: [1, 2], statut: 'initial', rentree: 'octobre' },
        label: '27 avr. 2026 (1ère/2ème initial oct.)',
    },
    {
        renderId: '2026-06-05-alternance',
        date: '2026-06-05',
        matcher: { years: [1, 2], statut: 'alternance' },
        label: '05 juin 2026 (1ère/2ème alternance)',
    },
    {
        renderId: '2026-06-05-janvier',
        date: '2026-06-05',
        matcher: { allYears: true, rentree: 'janvier' },
        label: '05 juin 2026 (toutes années jan.)',
    },
    {
        renderId: '2026-06-22-alternance',
        date: '2026-06-22',
        matcher: { years: [3, 4, 5], statut: 'alternance' },
        label: '22 juin 2026 (3ème-5ème alternance)',
    },
];

function matchesUser(matcher: ClassGroupMatcher, user: IUser, annee: number): boolean {
    if (matcher.allYears) {
        // Only filter by rentree if specified
        if (matcher.rentree && user.rentree !== matcher.rentree) return false;
        return true;
    }
    if (matcher.years && !matcher.years.includes(annee)) return false;
    if (matcher.statut && user.statut !== matcher.statut) return false;
    if (matcher.rentree && user.rentree !== matcher.rentree) return false;
    return true;
}

export function getApplicableRenderDates(user: IUser): RenderDateConfig[] {
    if (user.roles.includes('externe')) return [];

    const parseResult = validateClasse(user.classe);
    if (!parseResult.valid) return [];

    const { annee } = parseResult;

    return RENDER_DATES.filter(config => matchesUser(config.matcher, user, annee));
}
