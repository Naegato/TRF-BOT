import 'dotenv/config';
import { Client, Events, GatewayIntentBits, TextChannel, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction } from 'discord.js';
import { connectDatabase } from './database';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const channelId = '1479181177469534220';

const commands = [
    new SlashCommandBuilder()
        .setName('test2')
        .setDescription('A test command')
        .toJSON(),
];

client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commands });
    console.log('Slash commands registered.');

    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
        console.error('Channel not found or is not text-based');
        return;
    }

    if (channel instanceof TextChannel) {

        // await channel.send('Hello, world!');
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    console.log(`Received interaction: ${interaction.type} - ${interaction.id}`);
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'test2') {
        await (interaction as ChatInputCommandInteraction).reply('test command executed');
    }
});

connectDatabase();
client.login(process.env.DISCORD_TOKEN);
