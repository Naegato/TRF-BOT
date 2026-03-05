import { Guild, PermissionFlagsBits } from 'discord.js';

const ROLES: { name: string; permissions: bigint; color?: number }[] = [
    { name: 'ADMIN', permissions: PermissionFlagsBits.Administrator },
    { name: 'ESGI', permissions: 0n },
    { name: 'EXTERNE', permissions: 0n },
];

export async function ensureRoles(guild: Guild): Promise<void> {
    await guild.roles.fetch();

    for (const roleDef of ROLES) {
        const exists = guild.roles.cache.find(r => r.name === roleDef.name);
        if (!exists) {
            await guild.roles.create({ name: roleDef.name, permissions: roleDef.permissions });
            console.log(`[${guild.name}] Rôle "${roleDef.name}" créé.`);
        }
    }
}
