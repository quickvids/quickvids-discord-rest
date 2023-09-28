import type Command from "../classes/Command";
import type Context from "../classes/Context";

const ping: Command = {
    name: "ping",
    description: "Check if the bot is online.",
    perms: [],
    run: async (ctx: Context): Promise<void> => {
        return ctx.reply({
            embeds: [
                {
                    description: `🏓 **Pong!** The bot is online.`,
                    color: ctx.client.COLORS.BLURPLE,
                },
            ],
        });
    },
};

export default ping;
