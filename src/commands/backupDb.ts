import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { sqlite } from '../database';
import { requirePermission } from '../utils/permissions';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const command = new SlashCommandBuilder()
    .setName('backup-db')
    .setDescription('Télécharger une sauvegarde de la base de données (gérant uniquement)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(os.tmpdir(), `backup-${timestamp}.db`);

    await sqlite.backup(backupPath);

    const attachment = new AttachmentBuilder(backupPath, { name: `backup-${timestamp}.db` });
    await interaction.editReply({ content: '✅ Sauvegarde générée.', files: [attachment] });

    fs.unlinkSync(backupPath);
}

export const handleCommand = requirePermission('manager', handleCommandImpl);
