import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../models/User';

export const command = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Voir votre profil enregistré');

const ROLE_LABELS: Record<string, string> = {
    admin:   '🔴 Admin',
    esgi:    '🔵 ESGI',
    externe: '🟢 Externe',
};

const ROLE_COLORS: Record<string, number> = {
    admin:   0xe74c3c,
    esgi:    0x206694,
    externe: 0x2ecc71,
};

function embedColor(roles: string[]): number {
    if (roles.includes('admin'))   return ROLE_COLORS.admin;
    if (roles.includes('externe')) return ROLE_COLORS.externe;
    return ROLE_COLORS.esgi;
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
        await interaction.editReply('Vous n\'êtes pas encore inscrit. Utilisez `/register` pour vous inscrire.');
        return;
    }

    const member = await interaction.guild!.members.fetch(interaction.user.id).catch(() => null);
    const avatarUrl = interaction.user.displayAvatarURL({ size: 256 });

    const roles: string[] = user.roles ?? [];
    const roleDisplay = roles.length > 0
        ? roles.map(r => ROLE_LABELS[r] ?? r).join('  ·  ')
        : '—';

    const registeredAt = user.registeredAt
        ? `<t:${Math.floor(new Date(user.registeredAt).getTime() / 1000)}:D>`
        : '—';

    const embed = new EmbedBuilder()
        .setColor(embedColor(roles))
        .setAuthor({ name: interaction.user.tag, iconURL: avatarUrl })
        .setThumbnail(avatarUrl)
        .setTitle(`${user.prenom.toUpperCase()} ${user.nom.toUpperCase()}`)
        .addFields(
            { name: '📧 Email',        value: user.email,              inline: true  },
            { name: '🎓 Classe',       value: user.classe.toUpperCase(), inline: true },
            { name: '\u200b',          value: '\u200b',                inline: false },
            { name: '🏷️ Rôles',        value: roleDisplay,             inline: true  },
            { name: '📅 Inscrit le',   value: registeredAt,            inline: true  },
        )
        .setFooter({ text: `ID Discord : ${interaction.user.id}` });

    if (member?.nickname) {
        embed.setDescription(`*Surnom : ${member.nickname}*`);
    }

    await interaction.editReply({ embeds: [embed] });
}
