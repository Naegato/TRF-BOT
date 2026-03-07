import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { connectDatabase } from './database';
import * as register from './commands/register';
import * as listUsers from './commands/listUsers';
import * as deleteUser from './commands/deleteUser';
import * as makeAdmin from './commands/makeAdmin';
import * as adminRegister from './commands/adminRegister';
import * as profile from './commands/profile';
import * as points from './commands/points';
import * as pointsHistory from './commands/pointsHistory';
import { ensureRoles } from './utils/ensureRoles';
import { ensureChannels } from './utils/ensureChannels';
import { handleProofMessage, handleProofReaction } from './utils/handleProofChannel';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const commands = [
    register.command.toJSON(),
    listUsers.command.toJSON(),
    deleteUser.command.toJSON(),
    makeAdmin.command.toJSON(),
    adminRegister.command.toJSON(),
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
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'register') {
                await register.handleCommand(interaction);
            } else if (interaction.commandName === 'list-users') {
                await listUsers.handleCommand(interaction);
            } else if (interaction.commandName === 'delete-user') {
                await deleteUser.handleCommand(interaction);
            } else if (interaction.commandName === 'make-admin') {
                await makeAdmin.handleCommand(interaction);
            } else if (interaction.commandName === 'admin-register') {
                await adminRegister.handleCommand(interaction);
            } else if (interaction.commandName === 'profile') {
                await profile.handleCommand(interaction);
            } else if (interaction.commandName === 'points') {
                await points.handleCommand(interaction);
            } else if (interaction.commandName === 'points-history') {
                await pointsHistory.handleCommand(interaction);
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'register-type-esgi' || interaction.customId === 'register-type-externe') {
                await register.handleButtonInteraction(interaction);
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'register-modal-esgi' || interaction.customId === 'register-modal-externe') {
                await register.handleModalSubmit(interaction);
            }
        }
    } catch (err) {
        console.error('InteractionCreate error:', err);
    }
});

client.on(Events.MessageCreate, async (message) => {
    try {
        await handleProofMessage(message);
    } catch (err) {
        console.error('MessageCreate error:', err);
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
