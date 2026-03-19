import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { requirePermission } from '../utils/permissions';
import { TEMP_ROLE_NAME, ALL_MANAGED_ROLE_NAMES } from '../utils/ensureRoles';

const CONFIRMATION_PHRASE = 'SETUP';

async function handleCommandImpl(interaction: ChatInputCommandInteraction) {
    const confirmation = interaction.options.getString('confirmation', true);
    if (confirmation !== CONFIRMATION_PHRASE) {
        await interaction.reply({
            content: `Confirmation incorrecte. Tapez exactement \`${CONFIRMATION_PHRASE}\` pour continuer.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild!;
    await guild.roles.fetch();

    const tempRole = guild.roles.cache.find(r => r.name === TEMP_ROLE_NAME);
    if (!tempRole) {
        await interaction.editReply('❌ Le rôle **Temp** est introuvable. Relancez le bot pour qu\'il le recrée, puis réessayez.');
        return;
    }

    const members = await guild.members.fetch();
    const results = { reset: 0, skipped: 0 };

    for (const member of members.values()) {
        if (member.user.bot) continue;

        try {
            // Remove all bot-managed roles
            const managedToRemove = member.roles.cache.filter(r => ALL_MANAGED_ROLE_NAMES.includes(r.name));
            if (managedToRemove.size > 0) await member.roles.remove(managedToRemove);

            // Add Temp if not already present
            if (!member.roles.cache.has(tempRole.id)) await member.roles.add(tempRole);

            results.reset++;
        } catch {
            results.skipped++;
        }
    }

    await interaction.editReply(
        `✅ Setup terminé :\n` +
        `• **${results.reset}** membre(s) réinitialisé(s) → rôle **Temp** attribué\n` +
        (results.skipped > 0 ? `• **${results.skipped}** membre(s) ignoré(s) (permissions insuffisantes)` : ''),
    );
}

export const command = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Réinitialiser les rôles de tous les membres et attribuer le rôle Temp (gérant uniquement)')
    .addStringOption(opt =>
        opt.setName('confirmation')
            .setDescription(`Tapez "${CONFIRMATION_PHRASE}" pour confirmer`)
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const handleCommand = requirePermission('manager', handleCommandImpl);
