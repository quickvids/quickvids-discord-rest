import {
    APIActionRowComponent,
    APIButtonComponentWithCustomId,
    APIEmbed,
    APIInteractionDataOptionBase,
    ApplicationCommandType,
    ButtonStyle,
    ChannelType,
    ComponentType,
    InteractionContextType,
} from "discord-api-types/v10";
import { ContextMenuContext, SlashCommandContext } from "../classes/CommandContext";
import { ButtonContext } from "../classes/ComponentContext";
import Extension, { context_menu, persistent_component, slash_command } from "../classes/Extension";
import {
    MediaType,
    checkExistingQVShortUrl,
    checkForTikTokLink,
    checkUserFavorite,
    cleanDescription,
    getGuildConfig,
    hasPermission,
    insertEmbedLog,
    insertUserFavorite,
    removeUserFavorite,
} from "../classes/Functions";
import { GuildConfig as GuildConfigModel } from "../database/schema";
import { EmbedMethod } from "../types/discord";

async function validateAndGenerate({
    ctx,
    content,
    spoiler,
    ephemeral,
}: {
    ctx: SlashCommandContext | ContextMenuContext;
    content: string;
    spoiler: boolean;
    ephemeral?: boolean;
}): Promise<void> {

    // dumb check, if tiktok.com or instagram.com is not in the content, return an error
    const supported_tlds = ["tiktok.com", "instagram.com"];

    if (!supported_tlds.some((tld) => content.includes(tld))) {
        return ctx.friendlyError("We did not see a valid TikTok or Instagram link.", "7nVqDXkrHG");
    }

    let guildConfig: GuildConfigModel;

    if (ctx.channel?.type === ChannelType.DM || ctx.channel?.type === ChannelType.GroupDM) {
        guildConfig = new GuildConfigModel({ guild_id: "0" });
    } else {
        guildConfig = await getGuildConfig(ctx.guildId!);
    }

    const data = await fetch(
        `${process.env.API_BASE_URL}/v2/quickvids/shorturl`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.QUICKVIDS_API_TOKEN}`,
                "User-Agent": "QuickVids Rest Bot/1.0",
            },
            body: JSON.stringify({
                input_text: content,
                detailed: true
            }),
        }
    )

    if (data.status !== 200) {
        const error_code = "WrkKanvMfC";
        return ctx.friendlyError(
            `Sorry, there was an error creating a short url for that tiktok post. Please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            error_code
        );
    }

    const shorturl_response: any = await data.json();

    if (shorturl_response.quickvids_url === undefined) {
        const error_code = "WrkKanvMfC";
        return ctx.friendlyError(
            `Sorry, there was an error creating a short url for that tiktok post. Please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            error_code
        );
    }

    const qv_short_url = shorturl_response.quickvids_url;
    const video_id = shorturl_response.details.post.id;
    // Video type  = shorturl_response.details.post.type starts with tt_ or ig_
    let video_type: string;
    if (shorturl_response.type.startsWith("tt_")) {
        video_type = "tiktok";
    } else if (shorturl_response.type.startsWith("ig_")) {
        video_type = "instagram";
    } else {
        video_type = "unknown";
        throw new Error("Unknown video type???");
    }


    const messageTemplate = spoiler ? "|| {url} ||" : "{url}";

    let method: EmbedMethod;
    switch (ctx.rawInteraction.data.type) {
        case ApplicationCommandType.ChatInput:
            method = EmbedMethod.SlashCommand;
            break;
        case ApplicationCommandType.Message:
            method = EmbedMethod.AppContextMenu;
            break;
        default:
            method = EmbedMethod.Unknown;
            break;
    }

    await insertEmbedLog({
        method: method,
        guildId: ctx.guildId ?? "0",
        channelId: ctx.channelId,
        videoId: video_id,
        userId: ctx.authorID,
    });

    let components = [
        {
            type: ComponentType.Button,
            label: "Info",
            style: ButtonStyle.Secondary,
            emoji: {
                name: "🌐",
            },
            custom_id: `v_id${video_id}`,
        },
        {
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            emoji: {
                name: "🗑️",
            },
            custom_id: `delete${ctx.authorID}`,
        },
    ]

    if (ctx.context && ctx.context === InteractionContextType.PrivateChannel) {
        // remove the delete button
        components.pop();
    }

    if (video_type === "instagram") {
        // remove the info button
        components.shift();
    }

    console.log(`Embedding: ${video_id} | ${qv_short_url} | User: ${ctx.authorID}`);


    return ctx.reply(
        {
            content: messageTemplate.replace("{url}", qv_short_url),
            // @ts-ignore
            components: guildConfig.show_buttons
                ? [
                    {
                        type: ComponentType.ActionRow,
                        components: components,
                    },
                ]
                : [],
        },
        { ephemeral: ephemeral }
    );
}


export default class TikTok extends Extension {
    name = "tiktok";

    @context_menu({
        name: "Convert 📸",
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    })
    async tiktokContextMenu(ctx: ContextMenuContext): Promise<void> {
        const target_message = ctx.resolved?.messages?.[ctx.rawData.target_id];

        await validateAndGenerate({
            ctx,
            content: target_message?.content ?? "",
            spoiler: false,
        });
    }


    @slash_command({
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
            {
                name: "hidden",
                description: "Whether or not to make this output visible only to you.",
                type: 5,
                required: false,
            },
        ],
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    })
    async tiktok(ctx: SlashCommandContext): Promise<void> {

        const link = ctx.getOption("link") as APIInteractionDataOptionBase<3, string>;
        const spoiler = ctx.getOption("spoiler") as APIInteractionDataOptionBase<5, boolean>;
        const hidden = ctx.getOption("hidden") as APIInteractionDataOptionBase<5, boolean>;

        await validateAndGenerate({
            ctx,
            content: link.value,
            spoiler: spoiler === undefined ? false : spoiler.value, // If the spoiler option is not provided, set it to false.
            ephemeral: hidden === undefined ? false : hidden.value,
        });
    }


    @slash_command({
        name: "instagram",
        description: "Convert a Instagram link into a video.",
        options: [
            {
                name: "link",
                description: "The Instagram link to convert.",
                type: 3,
                required: true,
            },
            {
                name: "spoiler",
                description: "Whether or not to spoiler the video.",
                type: 5,
                required: false,
            },
            {
                name: "hidden",
                description: "Whether or not to make this output visible only to you.",
                type: 5,
                required: false,
            },
        ],
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    })
    async tiktok_wrapper(ctx: SlashCommandContext): Promise<void> {
        const link = ctx.getOption("link") as APIInteractionDataOptionBase<3, string>;
        const spoiler = ctx.getOption("spoiler") as APIInteractionDataOptionBase<5, boolean>;
        const hidden = ctx.getOption("hidden") as APIInteractionDataOptionBase<5, boolean>;

        await validateAndGenerate({
            ctx,
            content: link.value,
            spoiler: spoiler === undefined ? false : spoiler.value, // If the spoiler option is not provided, set it to false.
            ephemeral: hidden === undefined ? false : hidden.value,
        });
    }

    // fav
    @persistent_component({ custom_id: /^fav\d+$/ })
    async fav(ctx: ButtonContext): Promise<void> {
        await ctx.defer({ ephemeral: true, edit_origin: true });
        const id = ctx.custom_id.replace("fav", "");

        const paidUser = await ctx.client.command_premium_wall(ctx);
        if (paidUser === false) {
            return;
        }

        const inserted = await insertUserFavorite(ctx.authorID, id);

        let action_rows = ctx.data.message
            .components as APIActionRowComponent<APIButtonComponentWithCustomId>[];

        for (let row of action_rows) {
            for (let component of row.components) {
                if (component.custom_id === ctx.custom_id) {
                    component.label = "Remove From Library";
                    component.custom_id = `unfav${id}`;
                    break;
                }
            }
        }

        ctx.editOrigin({ components: action_rows });
    }

    // unfav
    @persistent_component({ custom_id: /^unfav\d+$/ })
    async unfav(ctx: ButtonContext): Promise<void> {
        await ctx.defer({ ephemeral: true, edit_origin: true });
        const id = ctx.custom_id.replace("unfav", "");

        const paidUser = await ctx.client.command_premium_wall(ctx);
        if (paidUser === false) {
            return;
        }

        const removed = await removeUserFavorite(ctx.authorID, id);

        let action_rows = ctx.data.message
            .components as APIActionRowComponent<APIButtonComponentWithCustomId>[];

        for (let row of action_rows) {
            for (let component of row.components) {
                if (component.custom_id === ctx.custom_id) {
                    component.label = "Add to Library";
                    component.custom_id = `fav${id}`;
                    break;
                }
            }
        }

        ctx.editOrigin({ components: action_rows });
    }

    // delete
    @persistent_component({ custom_id: /delete\d+/ })
    async delete(ctx: ButtonContext): Promise<void> {
        const id = ctx.custom_id.replace("delete", "");

        if (ctx.authorID !== id || !hasPermission("ManageMessages", ctx.data.member?.permissions)) {
            return ctx.reply("You cannot delete someone else's message.", { ephemeral: true });
        }


        await ctx.client.deleteMessage({
            channel_id: ctx.data.message.channel_id,
            message_id: ctx.data.message.id,
        });
    }

    @persistent_component({ custom_id: /v_id\d+/ })
    async info(ctx: ButtonContext): Promise<void> {
        ctx.defer({ ephemeral: true });
        const id = ctx.custom_id.replace("v_id", "");

        // fetch the tiktok and except any errors
        const tiktokData = await ctx.client.ttrequester.fetchPostInfo(id);

        if (tiktokData === null) {
            return ctx.friendlyError("We were unable to fetch the TikTok video.", "sWngEsstrV");
        } else if (tiktokData instanceof Error) {
            return ctx.reply(tiktokData.message, {
                ephemeral: true,
            });
        }

        let description = cleanDescription(
            tiktokData.desc,
            tiktokData.text_extra
        );

        if (description.cleaned.length > 256) {
            description.cleaned = description.cleaned.slice(0, 253) + "...";
        }

        let embed: APIEmbed = {
            title: description.cleaned,
            description: "——————",
            color: 0x5865f2,
            author: {
                name: tiktokData.author.nickname,
                icon_url: tiktokData.author.avatar_thumb.url_list[0],
                url: `https://tiktok.com/@${tiktokData.author.unique_id}`,
            },
            thumbnail: {
                url: tiktokData.video.cover.url_list[0],
            },
            fields: [
                {
                    name: "Views 👀",
                    value: (+tiktokData.statistics.play_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Likes ❤️",
                    value: (+tiktokData.statistics.digg_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Comments 💬",
                    value: (+tiktokData.statistics.comment_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Shares 🔃",
                    value: (+tiktokData.statistics.share_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Downloads 📥",
                    value: (+tiktokData.statistics.download_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Created 🕰️",
                    value: `<t:${Math.floor(tiktokData.create_time)}:R>`,
                    inline: true,
                },
            ],
        };

        if (description.hashtags.length > 0) {
            let tags: string = "";

            for (const tag of description.hashtags) {
                const tag_link = `[\`#${tag}\`](https://tiktok.com/tag/${tag}) `;
                if (tags.length + tag_link.length + 1 < 1024) {
                    tags += tag_link;
                } else {
                    tags = tags.slice(0, -1) + " ...";
                    break;
                }
            }

            embed.fields?.push({
                name: "Tags 🔖",
                value: tags,
                inline: false,
            });
        }

        const usrFavorited = await checkUserFavorite(ctx.authorID, id);

        const whichFavBtn = usrFavorited ? "unfav" : "fav";

        return ctx.reply(
            {
                embeds: [embed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Link,
                                label: "Download",
                                url: `${process.env.WEB_BASE_URL}/v/${id}`,
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Link,
                                label: "View on QuickVids",
                                url: `${process.env.WEB_BASE_URL}/v/${id}`,
                            },
                        ],
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "Audio",
                                emoji: {
                                    name: "🎵",
                                },
                                custom_id: `m_id${tiktokData.music.mid}`,
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Secondary,
                                label: "Add to Library",
                                emoji: {
                                    name: "⭐",
                                },
                                custom_id: `${whichFavBtn}${id}`,
                            },
                        ],
                    },
                ],
            },
            { ephemeral: true }
        );

        // sleepSync(1000); // NOTE: This prevents discord from combining the two messages into one.
        // ctx.replyFollowup("hello", { ephemeral: true });
    }

    // NOTE: Music button
    @persistent_component({ custom_id: /m_id\d+/ })
    async music(ctx: ButtonContext): Promise<void> {
        ctx.defer({ ephemeral: true });
        const id = ctx.custom_id.replace("m_id", "");

        const musicInfo = await ctx.client.ttrequester.fetchMusicInfo(id);

        if (musicInfo === null) {
            return ctx.friendlyError("We were unable to fetch the TikTok music.", "wCdPsqWMsj");
        } else if (musicInfo instanceof Error) {
            return ctx.reply(musicInfo.message, {
                ephemeral: true,
            });
        }

        const videoCount: number = musicInfo.music_info.user_count;
        const authorID: string = musicInfo.music_info.owner_id;
        const authorName: string = musicInfo.music_info.author;
        const authorAvatar: string = musicInfo.music_info.cover_thumb.url_list[0];
        const musicTitle: string = musicInfo.music_info.title;
        const musicCover: string = musicInfo.music_info.cover_large.url_list[0];
        const downloadUrl: string = musicInfo.music_info.play_url.url_list[0];
        const ttLink: string = `https://www.tiktok.com/music/quickvids-${id}`;

        let embed: APIEmbed = {
            description: `### [${musicTitle}](${ttLink})`,
            color: 0x5865f2,
            author: {
                name: authorName,
                icon_url: authorAvatar,
                url: `https://tiktok.com/@${authorID}`,
            },
            thumbnail: {
                url: musicCover,
            },
            fields: [
                {
                    name: "Video Count 📱",
                    value: (+videoCount).toLocaleString(),
                    inline: false,
                },
            ],
        };

        ctx.reply(
            {
                embeds: [embed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: ButtonStyle.Link,
                                label: "Download",
                                url: downloadUrl,
                            },
                            {
                                type: 2,
                                style: ButtonStyle.Link,
                                label: "View on TikTok",
                                url: ttLink,
                            },
                        ],
                    },
                ],
            },
            { ephemeral: true }
        );
    }
}
