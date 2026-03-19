import { ActivityType, SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, TextChannel, PermissionFlagsBits } from 'discord.js';
import { requirePermission } from '../utils/permissions';
import { CHANNEL_NAMES } from '../utils/ensureChannels';

export const command = new SlashCommandBuilder()
    .setName('stopbot')
    .setDescription('Mettre le bot en pause / maintenance (gérant uniquement)')
    .addStringOption(opt =>
        opt.setName('raison')
            .setDescription('Raison de la maintenance (affiché dans les canaux)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    const raison = interaction.options.getString('raison') ?? 'Maintenance en cours.';
    const client = interaction.client;

    // Confirm to the admin
    await interaction.reply({ content: `⏹️ Arrêt du bot en cours… Raison : *${raison}*`, flags: MessageFlags.Ephemeral });

    // Set presence so the bot appears as "En maintenance" in the member list
    client.user?.setPresence({
        status: 'dnd',
        activities: [{ name: `🔧 Maintenance — ${raison}`, type: ActivityType.Custom }],
    });

    // Broadcast to public and admin channels in every guild
    for (const guild of client.guilds.cache.values()) {
        await guild.channels.fetch();
        for (const channelName of [CHANNEL_NAMES.botCommands, CHANNEL_NAMES.adminCommands]) {
            const ch = guild.channels.cache.find(c => c.name === channelName) as TextChannel | undefined;
            if (ch) {
                await ch.send(`🔧 **Le bot est en maintenance.**\n> ${raison}\nLes commandes ne seront pas disponibles pendant cette période.`).catch(() => null);
            }
        }
    }

    // Give Discord time to flush the reply and messages before exiting
    await new Promise(res => setTimeout(res, 1500));
    process.exit(0);
}

export const handleCommand = requirePermission('manager', handleCommandImpl);
