import 'dotenv/config';
import { Client, ChatInputCommandInteraction, Events, GatewayIntentBits, MessageFlags, Partials, REST, Routes } from 'discord.js';
import { connectDatabase } from './database';
import { ensureRoles } from './utils/ensureRoles';
import { ensureChannels, CHANNEL_NAMES } from './utils/ensureChannels';
import { handleProofReaction } from './utils/handleProof';
import { restoreScheduledSessions } from './utils/sessionScheduler';
import * as register from './commands/register';
import * as adminRegister from './commands/adminRegister';
import * as setRole from './commands/setRole';
import * as openSession from './commands/openSession';
import * as closeSession from './commands/closeSession';
import * as presence from './commands/presence';
import * as scheduleSession from './commands/scheduleSession';
import * as createRendu from './commands/createRendu';
import * as profile from './commands/profile';
import * as points from './commands/points';
import * as pointsHistory from './commands/pointsHistory';
import * as resetServer from './commands/resetServer';
import * as deleteAccount from './commands/deleteAccount';
import * as deleteUser from './commands/deleteUser';
import * as listUsers from './commands/listUsers';

// ─── Channel routing ─────────────────────────────────────────────────────────

const COMMAND_CHANNEL: Record<string, string> = {
    'register':         CHANNEL_NAMES.register,
    'admin-register':   CHANNEL_NAMES.adminCommands,
    'set-role':         CHANNEL_NAMES.adminCommands,
    'open-session':     CHANNEL_NAMES.adminCommands,
    'close-session':    CHANNEL_NAMES.adminCommands,
    'schedule-session': CHANNEL_NAMES.adminCommands,
    'create-rendu':     CHANNEL_NAMES.adminCommands,
    'reset-server':     CHANNEL_NAMES.adminCommands,
    'delete-user':      CHANNEL_NAMES.adminCommands,
    'list-users':       CHANNEL_NAMES.adminCommands,
    'profile':          CHANNEL_NAMES.botCommands,
    'points':           CHANNEL_NAMES.botCommands,
    'points-history':   CHANNEL_NAMES.botCommands,
    'presence':         CHANNEL_NAMES.botCommands,
    'delete-account':   CHANNEL_NAMES.botCommands,
};

async function assertChannel(interaction: ChatInputCommandInteraction): Promise<boolean> {
    // Guild owner bypasses channel restrictions
    if (interaction.guild?.ownerId === interaction.user.id) return true;

    const required = COMMAND_CHANNEL[interaction.commandName];
    if (!required) return true;

    const current = interaction.channel;
    if (current && 'name' in current && current.name === required) return true;

    const target = interaction.guild?.channels.cache.find(c => c.name === required);
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

const commands = [
    register.command.toJSON(),
    adminRegister.command.toJSON(),
    setRole.command.toJSON(),
    openSession.command.toJSON(),
    closeSession.command.toJSON(),
    presence.command.toJSON(),
    scheduleSession.command.toJSON(),
    createRendu.command.toJSON(),
    profile.command.toJSON(),
    points.command.toJSON(),
    pointsHistory.command.toJSON(),
    resetServer.command.toJSON(),
    deleteAccount.command.toJSON(),
    deleteUser.command.toJSON(),
    listUsers.command.toJSON(),
];

client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commands });
    console.log('Slash commands registered.');

    for (const guild of client.guilds.cache.values()) {
        await ensureRoles(guild);
        await ensureChannels(guild);
    }

    await restoreScheduledSessions(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (!await assertChannel(interaction)) return;

            if (interaction.commandName === 'register') {
                await register.handleCommand(interaction);
            } else if (interaction.commandName === 'admin-register') {
                await adminRegister.handleCommand(interaction);
            } else if (interaction.commandName === 'set-role') {
                await setRole.handleCommand(interaction);
            } else if (interaction.commandName === 'open-session') {
                await openSession.handleCommand(interaction);
            } else if (interaction.commandName === 'close-session') {
                await closeSession.handleCommand(interaction);
            } else if (interaction.commandName === 'presence') {
                await presence.handleCommand(interaction);
            } else if (interaction.commandName === 'schedule-session') {
                await scheduleSession.handleCommand(interaction);
            } else if (interaction.commandName === 'create-rendu') {
                await createRendu.handleCommand(interaction);
            } else if (interaction.commandName === 'profile') {
                await profile.handleCommand(interaction);
            } else if (interaction.commandName === 'points') {
                await points.handleCommand(interaction);
            } else if (interaction.commandName === 'points-history') {
                await pointsHistory.handleCommand(interaction);
            } else if (interaction.commandName === 'reset-server') {
                await resetServer.handleCommand(interaction);
            } else if (interaction.commandName === 'delete-account') {
                await deleteAccount.handleCommand(interaction);
            } else if (interaction.commandName === 'delete-user') {
                await deleteUser.handleCommand(interaction);
            } else if (interaction.commandName === 'list-users') {
                await listUsers.handleCommand(interaction);
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'register:esgi' || interaction.customId === 'register:external') {
                await register.handleButton(interaction);
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('register-select:')) {
                await register.handleSelect(interaction);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('register-modal:')) {
                await register.handleModalSubmit(interaction);
            }
        }
    } catch (err) {
        console.error('InteractionCreate error:', err);
    }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        await handleProofReaction(reaction, user);
    } catch (err) {
        console.error('MessageReactionAdd error:', err);
    }
});

connectDatabase();
client.login(process.env.DISCORD_TOKEN);
