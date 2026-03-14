import { MessageReaction, PartialMessageReaction, User as DiscordUser, PartialUser } from 'discord.js';
import { User } from '../models/User';
import { Point } from '../models/Point';
import { CHANNEL_NAMES } from './ensureChannels';

const APPROVAL_EMOJI = '✅';

export async function handleProofReaction(
    reaction: MessageReaction | PartialMessageReaction,
    discordUser: DiscordUser | PartialUser,
): Promise<void> {
    if (discordUser.bot) return;
    if (reaction.emoji.name !== APPROVAL_EMOJI) return;

    // Fetch partials if needed
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const channel = reaction.message.channel;
    if (!('name' in channel) || channel.name !== CHANNEL_NAMES.proof) return;

    // Message must have an image attachment
    const hasImage = reaction.message.attachments.some(a => a.contentType?.startsWith('image/'));
    if (!hasImage) return;

    // Reactor must be a manager or deputy
    const reactor = await User.findOne({ discordId: discordUser.id });
    if (!reactor || (reactor.role !== 'manager' && reactor.role !== 'deputy')) return;

    // Message author must be registered and not external
    const author = reaction.message.author;
    if (!author || author.bot) return;
    const authorUser = await User.findOne({ discordId: author.id });
    if (!authorUser || authorUser.role === 'external') return;

    // Create point (unique index on messageId prevents duplicates)
    try {
        await Point.create({
            discordId: author.id,
            type: 'proof',
            grantedBy: discordUser.id,
            messageId: reaction.message.id,
        });
        await reaction.message.react('🏆');
    } catch {
        // Duplicate reaction or already rewarded — silently ignore
    }
}
