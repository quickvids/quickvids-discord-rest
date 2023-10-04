import { ApplicationCommandType } from "discord-api-types/v10";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import { SlashCommand } from "../classes/ApplicationCommand";

const textAutoComplete = async function autocomplete(ctx: AutocompleteContext) {
    const reqValue = ctx.data?.options[0].value;
    const choices = [
        {
            name: reqValue,
            value: reqValue,
        },
        {
            name: "test2",
            value: "test2",
        },
    ];
    return ctx.respond(choices);
};

const autofill: SlashCommand = {
    type: ApplicationCommandType.ChatInput,
    name: "autofill",
    description: "Autocomplete test",
    defaultMemberPermissions: [],
    dmPermission: true,
    nsfw: false,
    options: [
        {
            name: "text",
            description: "Text to autocomplete",
            type: 3,
            autocomplete: true,
            required: true,
        },
    ],
    scopes: [],
    autocompleteCallback: textAutoComplete,
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

export default autofill;
