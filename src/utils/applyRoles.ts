import { GuildMember } from 'discord.js';
import type { IUser } from '../models/User';
import {
    ALL_MANAGED_ROLE_NAMES,
    USER_ROLE_NAMES,
    YEAR_ROLE_NAMES,
    TRACK_ROLE_NAMES,
    INTAKE_ROLE_NAMES,
    RAIDER_ROLE_NAME,
} from './ensureRoles';

export async function applyRoles(member: GuildMember, user: IUser): Promise<void> {
    await member.guild.roles.fetch();

    const managedRoles = member.guild.roles.cache.filter(r =>
        ALL_MANAGED_ROLE_NAMES.includes(r.name),
    );

    // Remove all managed roles the member currently has
    const toRemove = member.roles.cache.filter(r => ALL_MANAGED_ROLE_NAMES.includes(r.name));
    if (toRemove.size > 0) {
        await member.roles.remove(toRemove);
    }

    // Build the list of roles to add
    const toAddNames: string[] = [USER_ROLE_NAMES[user.role], RAIDER_ROLE_NAME];

    if (user.role !== 'external' && user.year && user.track && user.intake) {
        toAddNames.push(YEAR_ROLE_NAMES[user.year]);
        toAddNames.push(TRACK_ROLE_NAMES[user.track]);
        toAddNames.push(INTAKE_ROLE_NAMES[user.intake]);
    }

    const toAdd = managedRoles.filter(r => toAddNames.includes(r.name));
    if (toAdd.size > 0) {
        await member.roles.add(toAdd);
    }
}
