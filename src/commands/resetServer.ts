import { SlashCommandBuilder, ChatInputCommandInteraction , MessageFlags } from 'discord.js';
import { ALL_MANAGED_ROLE_NAMES } from '../utils/ensureRoles';
import { CHANNEL_NAMES } from '../utils/ensureChannels';
import { isManagerOrOwner } from '../utils/permissions';

const CONFIRMATION_PHRASE = 'RESET SERVER';

export const command = new SlashCommandBuilder()
    .setName('reset-server')
    .setDescription('Supprimer tous les rôles, canaux et surnoms gérés par le bot (gérant uniquement)')
    .addStringOption(opt =>
        opt.setName('confirmation')
            .setDescription(`Tapez "${CONFIRMATION_PHRASE}" pour confirmer`)
            .setRequired(true));

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    if (!await isManagerOrOwner(interaction)) {
        await interaction.reply({ content: 'Seul le **Gérant** peut utiliser cette commande.', flags: MessageFlags.Ephemeral });
        return;
    }

    const confirmation = interaction.options.getString('confirmation', true);
    if (confirmation !== CONFIRMATION_PHRASE) {
        await interaction.reply({
            content: `Confirmation incorrecte. Tapez exactement \`${CONFIRMATION_PHRASE}\` pour continuer.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild   = interaction.guild!;
    const results = { roles: 0, channels: 0, nicknames: 0, skipped: 0 };

    await guild.roles.fetch();
    for (const name of ALL_MANAGED_ROLE_NAMES) {
        const role = guild.roles.cache.find(r => r.name === name);
        if (role) {
            await role.delete().catch(() => null);
            results.roles++;
        }
    }

    await guild.channels.fetch();
    for (const name of Object.values(CHANNEL_NAMES)) {
        const channel = guild.channels.cache.find(c => c.name === name);
        if (channel) {
            await channel.delete().catch(() => null);
            results.channels++;
        }
    }

    const members = await guild.members.fetch();
    for (const member of members.values()) {
        if (member.user.bot || !member.nickname) continue;
        const ok = await member.setNickname(null).then(() => true).catch(() => false);
        if (ok) results.nicknames++;
        else    results.skipped++;
    }

    await interaction.editReply(
        `Réinitialisation terminée :\n` +
        `• **${results.roles}** rôle(s) supprimé(s)\n` +
        `• **${results.channels}** canal/canaux supprimé(s)\n` +
        `• **${results.nicknames}** surnom(s) réinitialisé(s)` +
        (results.skipped > 0 ? `\n• **${results.skipped}** surnom(s) non réinitialisable(s) (propriétaire ou rôle supérieur)` : ''),
    );
}
