import { Guild, ChannelType, PermissionFlagsBits, CategoryChannel, TextChannel } from 'discord.js';

export async function ensureChannels(guild: Guild): Promise<void> {
    await guild.roles.fetch();
    await guild.channels.fetch();

    const adminRole   = guild.roles.cache.find(r => r.name === 'ADMIN');
    const esgiRole    = guild.roles.cache.find(r => r.name === 'ESGI');
    const externeRole = guild.roles.cache.find(r => r.name === 'EXTERNE');

    // Ensure "Bienvenue" category
    let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === 'Bienvenue'
    ) as CategoryChannel | undefined;

    if (!category) {
        category = await guild.channels.create({ name: 'Bienvenue', type: ChannelType.GuildCategory });
        console.log(`[${guild.name}] Catégorie "Bienvenue" créée.`);
    }

    // inscription-bot: @everyone can see, ESGI/EXTERNE/ADMIN cannot
    const inscriptionOverwrites = [
        { id: guild.roles.everyone, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(adminRole   ? [{ id: adminRole,   deny: [PermissionFlagsBits.ViewChannel] }] : []),
        ...(esgiRole    ? [{ id: esgiRole,    deny: [PermissionFlagsBits.ViewChannel] }] : []),
        ...(externeRole ? [{ id: externeRole, deny: [PermissionFlagsBits.ViewChannel] }] : []),
    ];

    // command-bot: @everyone cannot see, ESGI/EXTERNE/ADMIN can
    const commandOverwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        ...(adminRole   ? [{ id: adminRole,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ...(esgiRole    ? [{ id: esgiRole,    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ...(externeRole ? [{ id: externeRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
    ];

    const inscriptionChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.name === 'inscription-bot' && c.parentId === category!.id
    ) as TextChannel | undefined;

    if (!inscriptionChannel) {
        await guild.channels.create({
            name: 'inscription-bot',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: inscriptionOverwrites,
        });
        console.log(`[${guild.name}] Channel "inscription-bot" créé.`);
    } else {
        await inscriptionChannel.permissionOverwrites.set(inscriptionOverwrites);
    }

    const commandChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.name === 'command-bot' && c.parentId === category!.id
    ) as TextChannel | undefined;

    if (!commandChannel) {
        await guild.channels.create({
            name: 'command-bot',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: commandOverwrites,
        });
        console.log(`[${guild.name}] Channel "command-bot" créé.`);
    } else {
        await commandChannel.permissionOverwrites.set(commandOverwrites);
    }

    // preuve: ESGI can post images, ADMIN can view + react, @everyone denied
    const preuveOverwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        ...(esgiRole  ? [{ id: esgiRole,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }] : []),
        ...(adminRole ? [{ id: adminRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ManageMessages] }] : []),
    ];

    const preuveChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.name === 'preuve' && c.parentId === category!.id
    ) as TextChannel | undefined;

    if (!preuveChannel) {
        await guild.channels.create({
            name: 'preuve',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: preuveOverwrites,
        });
        console.log(`[${guild.name}] Channel "preuve" créé.`);
    } else {
        await preuveChannel.permissionOverwrites.set(preuveOverwrites);
    }
}
