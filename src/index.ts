import 'dotenv/config';
import { Client, ChatInputCommandInteraction, DiscordAPIError, Events, GatewayIntentBits, MessageFlags, Partials, REST, Routes, TextChannel } from 'discord.js';
import { connectDatabase } from './database';
import { reportError } from './utils/reportError';
import { ensureRoles } from './utils/ensureRoles';
import { ensureChannels, CHANNEL_NAMES } from './utils/ensureChannels';
import { handleProofReaction } from './utils/handleProof';
import { ensureRulesMessage } from './utils/ensureRulesMessage';
import { handleRulesReaction } from './utils/handleRulesReaction';
import { TEMP_ROLE_NAME } from './utils/ensureRoles';
import { restoreScheduledSessions } from './utils/sessionScheduler';
import { commandsJSON, commandMap, buttonHandlers, selectHandlers, modalHandlers } from './commands/registry';

// ─── Channel routing ─────────────────────────────────────────────────────────

const COMMAND_CHANNEL: Record<string, string> = {
    'inscription':        CHANNEL_NAMES.register,
    'admin-register':     CHANNEL_NAMES.adminCommands,
    'set-role':           CHANNEL_NAMES.adminCommands,
    'open-session':       CHANNEL_NAMES.adminCommands,
    'close-session':      CHANNEL_NAMES.adminCommands,
    'schedule-session':   CHANNEL_NAMES.adminCommands,
    'create-rendu':       CHANNEL_NAMES.adminCommands,
    'reset-server':       CHANNEL_NAMES.adminCommands,
    'delete-user':        CHANNEL_NAMES.adminCommands,
    'list-users':         CHANNEL_NAMES.adminCommands,
    'stopbot':            CHANNEL_NAMES.adminCommands,
    'set-rules-message':  CHANNEL_NAMES.adminCommands,
    'send-rules':         CHANNEL_NAMES.adminCommands,
    'setup':              CHANNEL_NAMES.adminCommands,
    'backup-db':          CHANNEL_NAMES.adminCommands,
    'profile':            CHANNEL_NAMES.botCommands,
    'points':             CHANNEL_NAMES.botCommands,
    'points-history':     CHANNEL_NAMES.botCommands,
    'presence':           CHANNEL_NAMES.botCommands,
    'delete-account':     CHANNEL_NAMES.botCommands,
};

async function assertChannel(interaction: ChatInputCommandInteraction): Promise<boolean> {
    // Guild owner bypasses channel restrictions
    if (interaction.guild?.ownerId === interaction.user.id) return true;

    const required = COMMAND_CHANNEL[interaction.commandName];
    if (!required) return true;

    const current = interaction.channel;
    if (current && 'name' in current && current.name === required) return true;

    const target  = interaction.guild?.channels.cache.find(c => c.name === required);
    const mention = target ? `<#${target.id}>` : `#${required}`;
    await interaction.reply({ content: `Cette commande ne peut être utilisée que dans ${mention}.`, flags: MessageFlags.Ephemeral });
    return false;
}

// ─── Client ──────────────────────────────────────────────────────────────────

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commandsJSON });
    console.log('Slash commands registered.');

    for (const guild of client.guilds.cache.values()) {
        await ensureRoles(guild);
        await ensureChannels(guild);
    }

    await ensureRulesMessage(client);
    await restoreScheduledSessions(client);

    // ─── Helper message in inscription channel ────────────────────────────────
    for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.find(
            c => c.name === CHANNEL_NAMES.register,
        ) as TextChannel | undefined;
        if (ch) {
            await ch.send('👋 Pour vous inscrire sur le serveur, utilisez la commande `/inscription` dans ce channel.');
        }
    }

    // ─── Reminder : configure Raider role permissions in Discord Integrations ──
    for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.find(
            c => c.name === CHANNEL_NAMES.adminCommands,
        ) as TextChannel | undefined;
        if (ch) {
            await ch.send(
                '⚙️ **Rappel configuration** — Les commandes utilisateurs suivantes sont **cachées par défaut**.\n' +
                'Pour les rendre accessibles aux membres inscrits, va dans\n' +
                '**Paramètres du serveur → Intégrations → [Bot] → [Commande]** et ajoute le rôle **Raider**.\n\n' +
                'Commandes concernées : `/presence` `/profile` `/points` `/points-history` `/delete-account`',
            );
        }
    }
});

// ─── Discord client error handler ────────────────────────────────────────────

client.on(Events.Error, async (err) => {
    await reportError(client, err, 'Discord client');
});

// ─── Process-level error handlers (prevent crashes) ──────────────────────────

process.on('unhandledRejection', async (reason) => {
    await reportError(client, reason, 'Unhandled rejection');
});

process.on('uncaughtException', async (err) => {
    await reportError(client, err, 'Uncaught exception');
});

// ─── Interactions ─────────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (!await assertChannel(interaction)) return;
            // Each handler in commandMap is wrapped with withErrorHandling
            const handler = commandMap.get(interaction.commandName);
            if (handler) await handler(interaction);

        } else if (interaction.isButton()) {
            const handler = buttonHandlers.find(h => h.match(interaction.customId));
            if (handler) await handler.handle(interaction);

        } else if (interaction.isStringSelectMenu()) {
            const handler = selectHandlers.find(h => h.match(interaction.customId));
            if (handler) await handler.handle(interaction);

        } else if (interaction.isModalSubmit()) {
            const handler = modalHandlers.find(h => h.match(interaction.customId));
            if (handler) await handler.handle(interaction);
        }
    } catch (err) {
        // 10062 = interaction token expired (harmless race at startup)
        // 40060 = interaction already acknowledged (harmless double-trigger)
        if (err instanceof DiscordAPIError && (err.code === 10062 || err.code === 40060)) return;
        await reportError(client, err, `Interaction ${interaction.type}`);
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        await member.guild.roles.fetch();
        const tempRole = member.guild.roles.cache.find(r => r.name === TEMP_ROLE_NAME);
        if (tempRole) await member.roles.add(tempRole);
    } catch (err) {
        await reportError(client, err, 'GuildMemberAdd');
    }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        await handleRulesReaction(reaction, user);
        await handleProofReaction(reaction, user);
    } catch (err) {
        await reportError(client, err, 'MessageReactionAdd');
    }
});

connectDatabase();
client.login(process.env.DISCORD_TOKEN);
