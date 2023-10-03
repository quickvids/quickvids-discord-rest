import { APIInteractionDataOptionBase, ApplicationCommandType } from "discord-api-types/v10";
import { checkForTikTokLink, getGuildConfig } from "../classes/Functions";
import InteractionCommand from "../classes/Command";
import { SlashCommandContext } from "../classes/CommandContext";

const tiktok: InteractionCommand = {
    type: ApplicationCommandType.ChatInput,
    name: "tiktok",
    description: "Convert a TikTok link into a video.",
    options: [
        {
            name: "link",
            description: "The TikTok link to convert.",
            type: 3,
            required: true,
        },
        {
            name: "spoiler",
            description: "Whether or not to spoiler the video.",
            type: 5,
            required: false,
        },
    ],
    perms: [],
    // @ts-expect-error
    run: async (ctx: SlashCommandContext): Promise<void> => {
        const link = ctx.getOption("link") as APIInteractionDataOptionBase<3, string>;
        let spoiler = ctx.getOption("spoiler") as APIInteractionDataOptionBase<5, boolean>;
        const guildConfig = await getGuildConfig(ctx.guildId!);

        // If the spoiler option is not provided, set it to false.
        const ephemeral = spoiler === undefined ? false : spoiler.value;

        const linkData = await checkForTikTokLink(link.value, true);

        if (linkData === null) {
            return ctx.reply(
                `The link you provided if not supported. \nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/7nVqDXkrHG>)`,
                {
                    ephemeral: true,
                }
            );
        }

        const tiktokData = await ctx.client.ttrequester.fetchPostInfo(linkData.id);

        if (tiktokData === null) {
            return ctx.reply(
                `The link you provided if not supported. \nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/7nVqDXkrHG>)`,
                {
                    ephemeral: true,
                }
            );
        } else if (tiktokData instanceof Error) {
            return ctx.reply(tiktokData.message, {
                ephemeral: true,
            });
        }

        return ctx.reply(tiktokData.aweme_detail.qv_short_url, { ephemeral });
    },
};

export default tiktok;
