import { Guild, PermissionFlagsBits } from 'discord.js';

const ROLES: { name: string; permissions: bigint; color: number }[] = [
    { name: 'ADMIN',       permissions: PermissionFlagsBits.Administrator, color: 0xe74c3c },
    { name: 'ESGI',        permissions: 0n,                                color: 0x206694 },
    { name: 'EXTERNE',     permissions: 0n,                                color: 0x2ecc71 },
    { name: 'ADJOINT',     permissions: 0n,                                color: 0xf39c12 },
    { name: 'RESPONSABLE', permissions: 0n,                                color: 0x9b59b6 },
];

export async function ensureRoles(guild: Guild): Promise<void> {
    await guild.roles.fetch();

    for (const roleDef of ROLES) {
        const existing = guild.roles.cache.find(r => r.name === roleDef.name);
        if (!existing) {
            await guild.roles.create({ name: roleDef.name, permissions: roleDef.permissions, color: roleDef.color, hoist: true });
            console.log(`[${guild.name}] Rôle "${roleDef.name}" créé.`);
        } else if (existing.color !== roleDef.color || !existing.hoist) {
            await existing.edit({ color: roleDef.color, hoist: true });
            console.log(`[${guild.name}] Rôle "${roleDef.name}" mis à jour.`);
        }
    }
}
