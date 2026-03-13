import 'dotenv/config';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { connectDatabase } from './database';
import { ensureRoles } from './utils/ensureRoles';
import * as register from './commands/register';
import * as adminRegister from './commands/adminRegister';
import * as setRole from './commands/setRole';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
});

const commands = [
    register.command.toJSON(),
    adminRegister.command.toJSON(),
    setRole.command.toJSON(),
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
    try {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'register') {
                await register.handleCommand(interaction);
            } else if (interaction.commandName === 'admin-register') {
                await adminRegister.handleCommand(interaction);
            } else if (interaction.commandName === 'set-role') {
                await setRole.handleCommand(interaction);
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

connectDatabase();
client.login(process.env.DISCORD_TOKEN);
