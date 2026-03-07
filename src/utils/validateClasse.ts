export const FILIERES_VALIDES = ['IW', 'IABD', 'ISI', 'RAS', 'GL', 'IDATA', 'BIA'];

const CLASSE_REGEX = /^([1-5])(IW|IABD|ISI|RAS|GL|IDATA|BIA)?([1-9]|J)$/;

type ValidResult = { valid: true; annee: number; filiere: string; suffix: string };
type InvalidResult = { valid: false; helpMessage: string };

export type ClasseParseResult = ValidResult | InvalidResult;

export function validateClasse(classe: string): ClasseParseResult {
    const match = classe.trim().toUpperCase().match(CLASSE_REGEX);
    if (!match) {
        const helpMessage = [
            '❌ Format de classe invalide.',
            '',
            '**Format attendu :** `{année}{filière?}{groupe}`',
            '- **Année :** 1 à 5',
            `- **Filière (3ème année et +) :** ${FILIERES_VALIDES.join(', ')}`,
            '- **Groupe :** 1-9 ou J (rentrée janvier)',
            '',
            '**Exemples valides :**',
            '`1J` `2J` `31` `3IW2` `4IABD1` `5ISI3` `3GL1`',
        ].join('\n');
        return { valid: false, helpMessage };
    }
    return {
        valid: true,
        annee: parseInt(match[1], 10),
        filiere: match[2] ?? '',
        suffix: match[3],
    };
}
