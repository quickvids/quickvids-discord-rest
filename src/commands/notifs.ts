import { APIInteractionDataOptionBase, ApplicationCommandType } from "discord-api-types/v10";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import { SlashCommand } from "../classes/ApplicationCommand";

const textAutoComplete = async function autocomplete(ctx: AutocompleteContext) {
    const username = ctx.data?.options[0].value;

    if (!username || username.length < 2) {
        return ctx.reply([
            {
                name: "Start typing a username!",
                value: "ERROR:start_search",
            },
        ]);
    }

    const user = await ctx.client.ttrequester.fetchUser(null, null, username);

    if (!user) {
        return ctx.reply([
            {
                name: "No users found | Make sure you are NOT using the Nickname",
                value: "QUICKVIDS:CANT_FIND",
            },
            {
                name: "--> Can't find who you are looking for?",
                value: "QUICKVIDS:CANT_FIND",
            },
        ]);
    }

    return ctx.reply([
        {
            name: `@${user.unique_id} | ${user.follower_count
                .valueOf()
                .toLocaleString()} Followers`,
            value: user.sec_uid,
        },
    ]);
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
        const sec_uid = ctx.getOption("text") as APIInteractionDataOptionBase<3, string>;

        if (sec_uid.value === "QUICKVIDS:CANT_FIND") {
            const error_code = "adwpQcyHvm";
            return ctx.reply(
                `Sorry we couldn't find your TikTok account, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
                {
                    ephemeral: true,
                }
            );
        }

        if (sec_uid.value === "ERROR:start_search") {
            return ctx.reply(
                "Oops! Use the command again, but this time, start typing a username.",
                {
                    ephemeral: true,
                }
            );
        }

        // if not b64_bytes.startswith(b"1.0.0\x01\x00\x00\x00"):

        const decoded_sec_uid = Buffer.from(sec_uid.value, "base64").toString("utf-8");
        const valid_sec_uid = decoded_sec_uid.startsWith("1.0.0\x01\x00\x00\x00");

        if (!valid_sec_uid) {
            const error_code = "3E9hetCUcc";
            return ctx.reply(
                `Please make sure to use the autocomplete menu, or if it's not working, join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
                {
                    ephemeral: true,
                }
            );
        }

        const user = await ctx.client.ttrequester.fetchUser(null, sec_uid.value, null);

        if (!user) {
            const error_code = "adwpQcyHvm";
            return ctx.reply(
                `Sorry we couldn't find your TikTok account, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
                {
                    ephemeral: true,
                }
            );
        }

        const userData = JSON.stringify(user);

        await ctx.reply(userData.substring(0, 100), {});
    },
};

export default autofill;
