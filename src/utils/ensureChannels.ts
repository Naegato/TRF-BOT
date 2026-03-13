import { ChannelType, Guild, PermissionFlagsBits, TextChannel } from 'discord.js';
import { USER_ROLE_NAMES } from './ensureRoles';

export const CHANNEL_NAMES = {
    proof:    'proof',
    presence: 'presence',
    rendu:    'rendu',
} as const;

export async function ensureChannels(guild: Guild): Promise<void> {
    await guild.channels.fetch();
    await guild.roles.fetch();

    const externalRole = guild.roles.cache.find(r => r.name === USER_ROLE_NAMES.external);
    const managerRole  = guild.roles.cache.find(r => r.name === USER_ROLE_NAMES.manager);
    const deputyRole   = guild.roles.cache.find(r => r.name === USER_ROLE_NAMES.deputy);

    // #proof and #presence — external users cannot send messages
    for (const name of [CHANNEL_NAMES.proof, CHANNEL_NAMES.presence]) {
        let ch = guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText) as TextChannel | undefined;
        if (!ch) {
            ch = await guild.channels.create({ name, type: ChannelType.GuildText }) as TextChannel;
            console.log(`Created channel #${name} in guild "${guild.name}".`);
        }
        if (externalRole) {
            await ch.permissionOverwrites.edit(externalRole, {
                SendMessages:         false,
                UseApplicationCommands: false,
            });
        }
    }

    // #rendu — visible and writable only by managers and deputies
    {
        let ch = guild.channels.cache.find(c => c.name === CHANNEL_NAMES.rendu && c.type === ChannelType.GuildText) as TextChannel | undefined;
        if (!ch) {
            ch = await guild.channels.create({ name: CHANNEL_NAMES.rendu, type: ChannelType.GuildText }) as TextChannel;
            console.log(`Created channel #${CHANNEL_NAMES.rendu} in guild "${guild.name}".`);
        }

        await ch.permissionOverwrites.set([
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // @everyone
            ...(managerRole ? [{ id: managerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
            ...(deputyRole  ? [{ id: deputyRole.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ]);
    }
}
