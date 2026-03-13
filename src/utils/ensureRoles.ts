import { Guild } from 'discord.js';
import type { Role, Track, Intake } from '../models/User';

export const USER_ROLE_NAMES: Record<Role, string> = {
    external:  'External',
    esgi:      'ESGI',
    manager:   'Manager',
    deputy:    'Deputy',
};

export const YEAR_ROLE_NAMES: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: 'Year 1',
    2: 'Year 2',
    3: 'Year 3',
    4: 'Year 4',
    5: 'Year 5',
};

export const TRACK_ROLE_NAMES: Record<Track, string> = {
    alternating: 'Alternating',
    initial:     'Initial',
};

export const INTAKE_ROLE_NAMES: Record<Intake, string> = {
    january:   'January',
    september: 'September',
};

export const ALL_MANAGED_ROLE_NAMES: string[] = [
    ...Object.values(USER_ROLE_NAMES),
    ...Object.values(YEAR_ROLE_NAMES),
    ...Object.values(TRACK_ROLE_NAMES),
    ...Object.values(INTAKE_ROLE_NAMES),
];

export async function ensureRoles(guild: Guild): Promise<void> {
    await guild.roles.fetch();
    const existing = guild.roles.cache.map(r => r.name);

    for (const name of ALL_MANAGED_ROLE_NAMES) {
        if (!existing.includes(name)) {
            await guild.roles.create({ name });
            console.log(`Created role "${name}" in guild "${guild.name}".`);
        }
    }
}
