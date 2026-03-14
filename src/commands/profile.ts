import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder , MessageFlags } from 'discord.js';
import { User } from '../models/User';
import { buildNickname } from '../utils/nickname';
import { currentPeriodPoints } from '../utils/rendus';

export const command = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Voir votre profil');

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.reply({ content: 'Vous devez vous inscrire avec `/register` en premier.', flags: MessageFlags.Ephemeral });
        return;
    }

    const period   = await currentPeriodPoints(user, interaction.guildId!);
    const nickname = buildNickname(user.firstName, user.lastName, user.year, user.track, user.intake);

    const sinceLabel = period.since
        ? `<t:${Math.floor(period.since.getTime() / 1000)}:D>`
        : 'le début';

    const embed = new EmbedBuilder()
        .setTitle(nickname)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor(0x5865f2)
        .addFields(
            { name: 'Prénom', value: user.firstName, inline: true },
            { name: 'Nom',    value: user.lastName,  inline: true },
            { name: 'Rôle',   value: user.role,       inline: true },
        );

    if (user.role !== 'external') {
        embed.addFields(
            { name: 'Année',   value: String(user.year), inline: true },
            { name: 'Filière', value: user.track!,        inline: true },
            { name: 'Rentrée', value: user.intake!,       inline: true },
        );
    }

    embed.addFields(
        { name: '⭐ Points OPEN', value: `**${period.capped}** / ${period.max} pt (depuis ${sinceLabel})`, inline: false },
        { name: 'Inscrit(e) le', value: `<t:${Math.floor(user.registeredAt.getTime() / 1000)}:D>`, inline: true },
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
