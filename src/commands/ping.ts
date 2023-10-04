import { ApplicationCommandType } from "discord-api-types/v10";
import { SlashCommandContext } from "../classes/CommandContext";
import { SlashCommand } from "../classes/ApplicationCommand";

const ping: SlashCommand = {
    type: ApplicationCommandType.ChatInput,
    name: "ping",
    description: "Check if the bot is online.",
    defaultMemberPermissions: [],
    dmPermission: true,
    nsfw: false,
    options: [],
    scopes: [],
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
