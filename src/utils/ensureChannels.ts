import { ChannelType, Guild, PermissionFlagsBits, TextChannel } from 'discord.js';
import { USER_ROLE_NAMES } from './ensureRoles';

export const CHANNEL_NAMES = {
    register:      'register',
    botCommands:   'command-bot',
    adminCommands: 'admin-command-bot',
    proof:         'proof',
    presence:      'presence',
    rendu:         'rendu',
} as const;

type ChannelSpec = {
    name:  string;
    setup: (ch: TextChannel, guild: Guild) => Promise<void>;
};

export async function ensureChannels(guild: Guild): Promise<void> {
    await guild.channels.fetch();
    await guild.roles.fetch();

    const role = (name: string) => guild.roles.cache.find(r => r.name === name);

    const esgiRole     = role(USER_ROLE_NAMES.esgi);
    const externalRole = role(USER_ROLE_NAMES.external);
    const managerRole  = role(USER_ROLE_NAMES.manager);
    const deputyRole   = role(USER_ROLE_NAMES.deputy);

    const registeredRoles = [esgiRole, externalRole, managerRole, deputyRole].filter(Boolean);
    const adminRoles      = [managerRole, deputyRole].filter(Boolean);

    const specs: ChannelSpec[] = [
        {
            // Visible only to non-registered users (no assigned role yet)
            name: CHANNEL_NAMES.register,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, allow: [PermissionFlagsBits.ViewChannel] },
                    ...registeredRoles.map(r => ({ id: r!.id, deny: [PermissionFlagsBits.ViewChannel] })),
                ]);
            },
        },
        {
            // Accessible to all registered users
            name: CHANNEL_NAMES.botCommands,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...registeredRoles.map(r => ({ id: r!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
                ]);
            },
        },
        {
            // Accessible to managers and deputies only
            name: CHANNEL_NAMES.adminCommands,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...adminRoles.map(r => ({ id: r!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
                ]);
            },
        },
        {
            // Visible to registered users only — external cannot post
            name: CHANNEL_NAMES.proof,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...registeredRoles.map(r => ({ id: r!.id, allow: [PermissionFlagsBits.ViewChannel] })),
                    ...(externalRole ? [{ id: externalRole.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.UseApplicationCommands] }] : []),
                ]);
            },
        },
        {
            // Visible to registered users only — external cannot post
            name: CHANNEL_NAMES.presence,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...registeredRoles.map(r => ({ id: r!.id, allow: [PermissionFlagsBits.ViewChannel] })),
                    ...(externalRole ? [{ id: externalRole.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.UseApplicationCommands] }] : []),
                ]);
            },
        },
        {
            // Visible to admins only
            name: CHANNEL_NAMES.rendu,
            setup: async (ch) => {
                await ch.permissionOverwrites.set([
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    ...adminRoles.map(r => ({ id: r!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
                ]);
            },
        },
    ];

    for (const spec of specs) {
        let ch = guild.channels.cache.find(c => c.name === spec.name && c.type === ChannelType.GuildText) as TextChannel | undefined;
        if (!ch) {
            ch = await guild.channels.create({ name: spec.name, type: ChannelType.GuildText }) as TextChannel;
            console.log(`Created channel #${spec.name} in guild "${guild.name}".`);
        }
        await spec.setup(ch, guild);
    }
}
