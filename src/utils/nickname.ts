import type { Track, Intake } from '../models/User';

const TRACK_LETTER: Record<Track, string> = {
    initial:     'I',
    alternating: 'A',
};

export function buildNickname(
    firstName: string,
    lastName: string,
    year?: number,
    track?: Track,
    intake?: Intake,
): string {
    const base = `${firstName.toUpperCase()} ${lastName.toUpperCase()}`;
    if (year !== undefined && track && intake) {
        // September is the default intake — omit its letter
        const intakeSuffix = intake === 'january' ? 'J' : '';
        return `${base} [${year}${TRACK_LETTER[track]}${intakeSuffix}]`;
    }
    return base;
}
