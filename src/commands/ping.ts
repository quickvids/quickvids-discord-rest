import { SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";

export default class Ping extends Extension {
    name = "ping";

    @slash_command("ping_new", "Check if the bot is online.")
    async ping(ctx: SlashCommandContext): Promise<void> {
        return ctx.reply({
            embeds: [
                {
                    description: `🏓 **Pong!** The bot is online.`,
                    color: ctx.client.COLORS.BLURPLE,
                },
            ],
        });
    }
}

// const ping: SlashCommand = {
//     type: ApplicationCommandType.ChatInput,
//     name: "ping",
//     description: "Check if the bot is online.",
//     defaultMemberPermissions: [],
//     dmPermission: true,
//     nsfw: false,
//     options: [],
//     scopes: [],
//     run: async (ctx: SlashCommandContext): Promise<void> => {
//         return ctx.reply({
//             embeds: [
//                 {
//                     description: `🏓 **Pong!** The bot is online.`,
//                     color: ctx.client.COLORS.BLURPLE,
//                 },
//             ],
//         });
//     },
// };
