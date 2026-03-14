import { Client, ChannelType, TextChannel, codeBlock } from 'discord.js';
import { CHANNEL_NAMES } from './ensureChannels';

export async function reportError(client: Client, error: unknown, context?: string): Promise<void> {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(context ? `[${context}]` : '[error]', message);

    for (const guild of client.guilds.cache.values()) {
        const channel = guild.channels.cache.find(
            c => c.name === CHANNEL_NAMES.errorLog && c.type === ChannelType.GuildText,
        ) as TextChannel | undefined;

        if (!channel) continue;

        const header = context ? `🚨 **${context}**\n` : '🚨 **Erreur inattendue**\n';
        const body   = codeBlock(message.slice(0, 1800));

        try {
            await channel.send(header + body);
        } catch {
            // Channel not accessible — already logged to console above
        }
    }
}
