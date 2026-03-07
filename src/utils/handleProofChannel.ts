import {
    Message,
    MessageReaction,
    PartialMessageReaction,
    User,
    PartialUser,
    ChannelType,
    TextChannel,
} from 'discord.js';
import { Point } from '../models/Point';
import { User as UserModel } from '../models/User';

const PROOF_CHANNEL_NAME = 'preuve';

export async function handleProofMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    const channel = message.channel as TextChannel;
    if (channel.name !== PROOF_CHANNEL_NAME) return;

    const hasImage = message.attachments.size > 0 &&
        message.attachments.every(a => a.contentType?.startsWith('image/'));

    if (!hasImage) {
        await message.delete().catch(() => null);
        const warn = await channel.send(
            `<@${message.author.id}> Seules les images sont autorisées dans ce channel.`
        );
        setTimeout(() => warn.delete().catch(() => null), 5000);
    }
}

export async function handleProofReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
): Promise<void> {
    if (user.bot) return;

    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }
    if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return; }
    }

    const message = reaction.message as Message;
    if (message.channel.type !== ChannelType.GuildText) return;
    if ((message.channel as TextChannel).name !== PROOF_CHANNEL_NAME) return;

    const guild = message.guild;
    if (!guild) return;

    // Reactor must have ADMIN role
    const reactor = await guild.members.fetch(user.id).catch(() => null);
    if (!reactor) return;

    const adminRole = guild.roles.cache.find(r => r.name === 'ADMIN');
    if (!adminRole || !reactor.roles.cache.has(adminRole.id)) return;

    // Don't grant points to the admin themselves
    if (message.author?.id === user.id) return;

    // Author must be a registered ESGI member
    const author = await UserModel.findOne({ discordId: message.author?.id });
    if (!author || !author.roles?.includes('esgi')) return;

    try {
        await Point.create({
            discordId: message.author!.id,
            amount: 0.25,
            grantedBy: user.id,
            messageId: message.id,
            channelId: message.channel.id,
        });
        await message.react('⭐').catch(() => null);
    } catch (err: any) {
        if (err.code === 11000) return; // déjà accordé par cet admin
        throw err;
    }
}
