import { Client, TextChannel } from 'discord.js';
import { CHANNEL_NAMES } from './ensureChannels';
import { getConfig, setConfig } from './configStore';

const RULES_MSG_KEY = 'rulesMessageId';

export function getRulesMessageId(guildId: string): string | undefined {
    return getConfig(guildId, RULES_MSG_KEY);
}

export function setRulesMessageId(guildId: string, messageId: string): void {
    setConfig(guildId, RULES_MSG_KEY, messageId);
}

export async function ensureRulesMessage(client: Client): Promise<void> {
    for (const guild of client.guilds.cache.values()) {
        // If already stored in DB, nothing to do
        if (getRulesMessageId(guild.id)) continue;

        const channel = guild.channels.cache.find(
            c => c.name === CHANNEL_NAMES.rules,
        ) as TextChannel | undefined;
        if (!channel) continue;

        // Look for an existing message posted by the bot
        const messages = await channel.messages.fetch({ limit: 50 });
        const existing = messages.find(m => m.author.id === client.user!.id);

        if (existing) {
            setRulesMessageId(guild.id, existing.id);
            console.log(`Reusing rules message ${existing.id} in #${channel.name} (${guild.name}).`);
        } else {
            const msg = await channel.send(
                '📜 **Règlement**\n\nVeuillez lire le règlement ci-dessus et réagir avec ✅ pour accéder au serveur.',
            );
            setRulesMessageId(guild.id, msg.id);
            console.log(`Posted rules message ${msg.id} in #${channel.name} (${guild.name}).`);
        }
    }
}
