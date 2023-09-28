import type Command from "../classes/Command";
import type Context from "../classes/Context";

const info: Command = {
    name: "info",
    description:
        "Here is some general information and statistics about QuickVids.",
    perms: [],
    run: async (ctx: Context): Promise<void> => {
        const stats = await ctx.client.database.getBotStats();
        const since = new Date().setHours(0, 0, 0, 0);
        const timestamp = `<t:${Math.floor(since / 1000)}:R>`;

        let embed = {
            title: "QuickVids Info",
            description:
                "Here is some general information and statistics about QuickVids.",
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
                    value: `${(
                        await ctx.client.database.getDatabasePing()
                    ).toFixed(0)}ms`,
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
    },
};

export default info;
