import { ApplicationIntegrationType as IntegrationType, InteractionContextType as CtxType } from "discord-api-types/v10";
import { SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";

export default class Info extends Extension {
    name = "info";

    @slash_command({
        name: "info",
        description: "Get some general information and statistics about QuickVids.",
        integration_types: [IntegrationType.GuildInstall, IntegrationType.UserInstall],
        contexts: [CtxType.BotDM, CtxType.Guild, CtxType.PrivateChannel]
    })
    async info(ctx: SlashCommandContext): Promise<void> {
        return ctx.reply("🚧 This command is being worked on. 🏗️", { ephemeral: true });

        const stats = await ctx.client.database.getBotStats();
        const since = new Date().setHours(0, 0, 0, 0);
        const timestamp = `<t:${Math.floor(since / 1000)}:R>`;

        let embed = {
            title: "QuickVids Info",
            description: "Here is some general information and statistics about QuickVids.",
            color: 0x5865f2, // Hex color code
            fields: [
                {
                    name: "TikToks Embedded 📈",
                    value: `${stats.total_embedded.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: "Past 24 Hours ⌛",
                    value: `${stats.embedded_past_24_hours.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: "Embedded Today 📅",
                    value: `${stats.embedded_today.toLocaleString()} since ${timestamp}`,
                    inline: true,
                },
                {
                    name: "User Count 👤",
                    value: `${stats.total_users.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: "Total Servers 🏠",
                    value: `${stats.server_count.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: "Ping 🏓",
                    value: `${(await ctx.client.database.getDatabasePing()).toFixed(0)}ms`,
                    inline: true,
                },
            ],
        };

        const topggStats = await ctx.client.getTopggVotes();

        if (topggStats) {
            embed.fields.push({
                name: "Top.gg Votes 📈",
                value: `${topggStats.points.toLocaleString()}`,
                inline: true,
            });
        }

        return ctx.reply({
            embeds: [embed],
        });
    }
}
