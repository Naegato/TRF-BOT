import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { getRulesMessageId } from './ensureRulesMessage';
import { TEMP_ROLE_NAME } from './ensureRoles';

export async function handleRulesReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
): Promise<void> {
    if (user.bot) return;
    if (reaction.emoji.name !== '✅') return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const rulesId = getRulesMessageId(guild.id);
    if (!rulesId || reaction.message.id !== rulesId) return;

    const member = await guild.members.fetch(user.id);
    const tempRole = guild.roles.cache.find(r => r.name === TEMP_ROLE_NAME);
    if (!tempRole || !member.roles.cache.has(tempRole.id)) return;

    await member.roles.remove(tempRole);
}
