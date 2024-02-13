import {
    APIActionRowComponent,
    APIButtonComponentWithCustomId,
    ButtonStyle,
    ChannelType,
    ComponentType
} from "discord-api-types/v10";
import InteractionContext from "../classes/CommandContext";
import {
    MediaType,
    checkExistingQVShortUrl,
    checkForTikTokLink,
    getGuildConfig,
    insertEmbedLog
} from "../classes/Functions";
import { GuildConfig as GuildConfigModel } from "../database/schema";
import { EmbedMethod } from "../types/discord";


function _friendlyError(message: string, error_code: string) {
    return `${message}\nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``;
}

export async function gatewayValidateAndGenerate({ ctx }: { ctx: InteractionContext }) {
    const message = ctx.message?.content!;
    const linkData = await checkForTikTokLink(message, true);

    if (linkData === null) {
        return {
            content: _friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG"),
            error: true,
        };
    }

    let guildConfig: GuildConfigModel;

    if (ctx.channel?.type === ChannelType.DM) {
        guildConfig = new GuildConfigModel({ guild_id: "0" });
    } else {
        guildConfig = await getGuildConfig(ctx.guild_id!);
    }

    // guildConfig.listen_channels
    // check if channel ID and if it's in the listen_channels array, return no content
    // if it's not in the array, return friendly error message
    if (ctx.channel !== undefined && ctx.channel.id !== null) {
        if (
            guildConfig.listen_channels.length > 0 &&
            guildConfig.listen_channels.includes(ctx.channel.id) === false
        ) {
            return {
                content: "",
                components: [],
                error: false,
            };
        }
    }

    if (linkData.type === MediaType.TikTokUser) {
        return {
            content: _friendlyError(
                "At this time, we do not support TikTok user links. Suggest a use case in our support server!",
                "b7ZHXYyeEB"
            ),
            error: true,
        };
    } else if (linkData.type === MediaType.UNKNOWN) {
        return {
            content: _friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG"),
            error: true,
        };
    }

    let qv_short_url: string | null = null;

    const existingLink = await checkExistingQVShortUrl(linkData.id);

    if (existingLink !== null && guildConfig.markdown_links === false) {
        qv_short_url = existingLink;
    } else {
        const tiktokData = await ctx.client.ttrequester.fetchPostInfo(linkData.id);

        if (tiktokData === null) {
            return {
                content: _friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG"),
                error: true,
            };
        } else if (tiktokData instanceof Error) {
            return {
                content: tiktokData.message,
                error: true,
            };
        }

        qv_short_url = tiktokData.aweme_detail.qv_short_url;

        if (qv_short_url === null) {
            return {
                content: _friendlyError(
                    "Something went wrong. Please try again later.",
                    "7nVqDXkrHG"
                ),
                error: true,
            };
        }
    }
    const messageTemplate = linkData.spoiler ? `|| ${qv_short_url} ||` : qv_short_url;

    const components: APIActionRowComponent<APIButtonComponentWithCustomId>[] = [
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    label: "Info",
                    style: ButtonStyle.Secondary,
                    emoji: {
                        name: "🌐",
                    },
                    custom_id: `v_id${linkData.id}`,
                },
                {
                    type: ComponentType.Button,
                    style: ButtonStyle.Danger,
                    emoji: {
                        name: "🗑️",
                    },
                    custom_id: `delete${ctx.user.id}`,
                },
            ],
        },
    ];

    await insertEmbedLog({
        method: EmbedMethod.Gateway,
        guildId: ctx.guildId ?? "0",
        channelId: ctx.channelId,
        videoId: linkData.id,
        userId: ctx.user.id,
    });

    return {
        content: messageTemplate,
        components: guildConfig.show_buttons ? components : null,
        error: false,
    };
}
