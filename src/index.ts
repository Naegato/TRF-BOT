import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { connectDatabase } from './database';
import { ensureRoles } from './utils/ensureRoles';
import { ensureChannels } from './utils/ensureChannels';
import { handleProofReaction } from './utils/handleProof';
import { restoreScheduledSessions } from './utils/sessionScheduler';
import * as register from './commands/register';
import * as adminRegister from './commands/adminRegister';
import * as setRole from './commands/setRole';
import * as openSession from './commands/openSession';
import * as closeSession from './commands/closeSession';
import * as presence from './commands/presence';
import * as scheduleSession from './commands/scheduleSession';
import * as profile from './commands/profile';
import * as points from './commands/points';
import * as pointsHistory from './commands/pointsHistory';

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
    profile.command.toJSON(),
    points.command.toJSON(),
    pointsHistory.command.toJSON(),
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
            } else if (interaction.commandName === 'profile') {
                await profile.handleCommand(interaction);
            } else if (interaction.commandName === 'points') {
                await points.handleCommand(interaction);
            } else if (interaction.commandName === 'points-history') {
                await pointsHistory.handleCommand(interaction);
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'register:esgi' || interaction.customId === 'register:external') {
                await register.handleButton(interaction);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'register-modal:esgi' || interaction.customId === 'register-modal:external') {
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
