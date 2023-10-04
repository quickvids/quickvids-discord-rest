import { ApplicationCommandType } from "discord-api-types/v10";
import { ContextMenuContext } from "../classes/CommandContext";
import { ContextMenu } from "../classes/ApplicationCommand";

const say: ContextMenu = {
    type: ApplicationCommandType.Message,
    name: "Say",
    defaultMemberPermissions: [],
    dmPermission: false,
    nsfw: false,
    scopes: [],
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
