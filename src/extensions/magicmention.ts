import { APIInteractionDataOptionBase } from "discord-api-types/v10";
import { SlashCommand } from "../classes/ApplicationCommand";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";

const textAutoComplete = async function autocomplete(
    ctx: AutocompleteContext,
    focusedOption?: APIInteractionDataOptionBase<3, string>
) {
    if (!focusedOption) {
        const choices = [
            {
                name: "Start typing a username!",
                value: "ERROR:start_search",
            },
        ];
        return ctx.reply({ choices });
    }

    const username = focusedOption.value;

    if (!username || username.length < 2) {
        const choices = [
            {
                name: "Start typing a username!",
                value: "ERROR:start_search",
            },
        ];
        return ctx.reply({ choices });
    }

    const user = await ctx.client.ttrequester.fetchUser(null, null, username);

    if (!user) {
        const choices = [
            {
                name: "No users found | Make sure you are NOT using the Nickname",
                value: "QUICKVIDS:CANT_FIND",
            },
            {
                name: "--> Can't find who you are looking for?",
                value: "QUICKVIDS:CANT_FIND",
            },
        ];
        return ctx.reply({ choices });
    }

    const choices = [
        {
            name: `@${user.unique_id} | ${user.follower_count
                .valueOf()
                .toLocaleString()} Followers`,
            value: user.sec_uid,
        },
    ];

    return ctx.reply({ choices });
};

export default class MagicMention extends Extension {
    name = "magicmention";

    @slash_command({
        name: "mention",
        description: "Magic Mention",
        options: [
            {
                name: "link",
                description: "Link to your TikTok profile",
                type: 1,
                options: [
                    {
                        name: "text",
                        description: "Text to autocomplete",
                        type: 3,
                        autocomplete: true,
                        required: true,
                    },
                ],
            },
        ],
        autocompleteCallbacks: [
            {
                option_name: "text",
                callback: textAutoComplete,
            },
        ],
    })
    async mention(ctx: SlashCommandContext): Promise<void> {
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
    }
}
