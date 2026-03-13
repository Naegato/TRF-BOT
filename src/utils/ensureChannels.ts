import { ChannelType, Guild } from 'discord.js';

export const CHANNEL_NAMES = {
    proof:    'proof',
    presence: 'presence',
} as const;

export async function ensureChannels(guild: Guild): Promise<void> {
    await guild.channels.fetch();

    for (const name of Object.values(CHANNEL_NAMES)) {
        const exists = guild.channels.cache.some(c => c.name === name);
        if (!exists) {
            await guild.channels.create({ name, type: ChannelType.GuildText });
            console.log(`Created channel #${name} in guild "${guild.name}".`);
        }
    }
}
