import { Guild } from 'discord.js';
import type { Role, Track, Intake } from '../models/User';

// ─── Role specs (name + default color) ───────────────────────────────────────

type RoleSpec = { name: string; color: number };

export const USER_ROLE_SPECS: Record<Role, RoleSpec> = {
    external: { name: 'Externe',  color: 0x99AAB5 }, // grey
    esgi:     { name: 'ESGI',     color: 0x5865F2 }, // Discord blurple
    deputy:   { name: 'Adjoint',  color: 0xFF8C00 }, // orange
    manager:  { name: 'Gérant',   color: 0xFFD700 }, // gold
};

export const YEAR_ROLE_SPECS: Record<1 | 2 | 3 | 4 | 5, RoleSpec> = {
    1: { name: '1ère', color: 0x00BCD4 }, // cyan
    2: { name: '2ème', color: 0x26C6DA }, // light cyan
    3: { name: '3ème', color: 0x26A69A }, // teal
    4: { name: '4ème', color: 0x66BB6A }, // green
    5: { name: '5ème', color: 0xD4E157 }, // lime
};

export const TRACK_ROLE_SPECS: Record<Track, RoleSpec> = {
    alternating: { name: 'Alternance', color: 0xE91E63 }, // pink
    initial:     { name: 'Initial',    color: 0xAB47BC }, // purple
};

export const INTAKE_ROLE_SPECS: Record<Intake, RoleSpec> = {
    january:   { name: 'Janvier',   color: 0x42A5F5 }, // light blue
    september: { name: 'Septembre', color: 0xFFA726 }, // amber
};

export const TEMP_ROLE_SPEC: RoleSpec   = { name: 'Temp',   color: 0x95A5A6 }; // grey
export const RAIDER_ROLE_SPEC: RoleSpec = { name: 'Raider', color: 0xE74C3C }; // red

export const TEMP_ROLE_NAME   = TEMP_ROLE_SPEC.name;
export const RAIDER_ROLE_NAME = RAIDER_ROLE_SPEC.name;

// ─── Flat name maps (used by applyRoles, ensureChannels, etc.) ────────────────

export const USER_ROLE_NAMES  = Object.fromEntries(Object.entries(USER_ROLE_SPECS) .map(([k, v]) => [k, v.name])) as Record<Role, string>;
export const YEAR_ROLE_NAMES  = Object.fromEntries(Object.entries(YEAR_ROLE_SPECS) .map(([k, v]) => [k, v.name])) as Record<string, string>;
export const TRACK_ROLE_NAMES = Object.fromEntries(Object.entries(TRACK_ROLE_SPECS).map(([k, v]) => [k, v.name])) as Record<Track, string>;
export const INTAKE_ROLE_NAMES = Object.fromEntries(Object.entries(INTAKE_ROLE_SPECS).map(([k, v]) => [k, v.name])) as Record<Intake, string>;

export const ALL_MANAGED_ROLE_NAMES: string[] = [
    ...Object.values(USER_ROLE_NAMES),
    ...Object.values(YEAR_ROLE_NAMES),
    ...Object.values(TRACK_ROLE_NAMES),
    ...Object.values(INTAKE_ROLE_NAMES),
    RAIDER_ROLE_NAME,
];

// ─── Ensure roles exist with correct name and color ──────────────────────────

const ALL_SPECS: RoleSpec[] = [
    TEMP_ROLE_SPEC,
    RAIDER_ROLE_SPEC,
    ...Object.values(USER_ROLE_SPECS),
    ...Object.values(YEAR_ROLE_SPECS),
    ...Object.values(TRACK_ROLE_SPECS),
    ...Object.values(INTAKE_ROLE_SPECS),
];

export async function ensureRoles(guild: Guild): Promise<void> {
    await guild.roles.fetch();

    for (const spec of ALL_SPECS) {
        const existing = guild.roles.cache.find(r => r.name === spec.name);
        if (!existing) {
            await guild.roles.create({ name: spec.name, colors: { primaryColor: spec.color } });
            console.log(`Created role "${spec.name}" in guild "${guild.name}".`);
        } else if (existing.color !== spec.color) {
            await existing.setColor(spec.color);
        }
    }
}
