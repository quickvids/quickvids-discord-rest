import { ApplicationCommandType } from "discord-api-types/v10";
import type InteractionCommand from "../classes/Command";
import { SlashCommandContext } from "../classes/CommandContext";

const ping: InteractionCommand = {
    type: ApplicationCommandType.ChatInput,
    name: "ping",
    description: "Check if the bot is online.",
    perms: [],
    // @ts-expect-error
    run: async (ctx: SlashCommandContext): Promise<void> => {
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