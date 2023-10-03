import { ApplicationCommandType } from "discord-api-types/v10";
import type InteractionCommand from "../classes/Command";
import { ContextMenuContext } from "../classes/CommandContext";

const say: InteractionCommand = {
    type: ApplicationCommandType.Message,
    name: "Say 🙊",
    perms: [],
    // @ts-expect-error
    run: async (ctx: ContextMenuContext): Promise<void> => {
        const messageId = Object.keys(ctx.resolved?.messages ?? {})[0];
        const message = ctx.resolved?.messages?.[messageId];
        console.log(message);

        return ctx.reply({
            embeds: [
                {
                    description: message ? message.content : "No message found",
                    color: ctx.client.COLORS.BLURPLE,
                },
            ],
        });
    },
};

export default say;
