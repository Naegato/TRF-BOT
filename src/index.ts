import 'dotenv/config';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { connectDatabase } from './database';
import * as register from './commands/register';
import * as listUsers from './commands/listUsers';
import { ensureRoles } from './utils/ensureRoles';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const commands = [
    register.command.toJSON(),
    listUsers.command.toJSON(),
];

client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commands });
    console.log('Slash commands registered.');

    for (const guild of client.guilds.cache.values()) {
        await ensureRoles(guild);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'register') {
            await register.handleCommand(interaction);
        } else if (interaction.commandName === 'list-users') {
            await listUsers.handleCommand(interaction);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'register-modal') {
            await register.handleModalSubmit(interaction);
        }
    }
});

connectDatabase();
client.login(process.env.DISCORD_TOKEN);
