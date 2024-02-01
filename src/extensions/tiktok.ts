import {
    APIActionRowComponent,
    APIButtonComponentWithCustomId,
    APIEmbed,
    APIInteractionDataOptionBase,
    APIMessageActionRowComponent,
    ButtonStyle,
    ChannelType,
    ComponentType,
} from "discord-api-types/v10";
import { ContextMenuContext, SlashCommandContext } from "../classes/CommandContext";
import Extension, { context_menu, persistent_component, slash_command } from "../classes/Extension";
import {
    MediaType,
    checkExistingQVShortUrl,
    checkForTikTokLink,
    checkUserFavorite,
    cleanDescription,
    getGuildConfig,
    hasPermission,
    insertUserFavorite,
    removeUserFavorite,
} from "../classes/Functions";
import { GuildConfig as GuildConfigModel } from "../database/schema";
import { ButtonContext } from "../classes/ComponentContext";

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
    const linkData = await checkForTikTokLink(content, true);

    if (linkData === null) {
        return ctx.friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG");
    }

    let guildConfig: GuildConfigModel;

    if (ctx.channel?.type === ChannelType.DM) {
        guildConfig = new GuildConfigModel({ guild_id: "0" });
    } else {
        guildConfig = await getGuildConfig(ctx.guildId!);
    }

    if (linkData.type === MediaType.TikTokUser) {
        return ctx.friendlyError(
            "At this time, we do not support TikTok user links. Suggest a use case in our support server!",
            "b7ZHXYyeEB"
        );
    } else if (linkData.type === MediaType.UNKNOWN) {
        return ctx.friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG");
    }

    let qv_short_url: string | null = null;

    const existingLink = await checkExistingQVShortUrl(linkData.id);

    if (existingLink !== null && guildConfig.markdown_links === false) {
        qv_short_url = existingLink;
    } else {
        const tiktokData = await ctx.client.ttrequester.fetchPostInfo(linkData.id);

        if (tiktokData === null) {
            return ctx.friendlyError("We did not see a valid TikTok link.", "7nVqDXkrHG");
        } else if (tiktokData instanceof Error) {
            return ctx.reply(tiktokData.message, {
                ephemeral: true,
            });
        }

        qv_short_url = tiktokData.aweme_detail.qv_short_url;
    }

    if (qv_short_url === null) {
        return ctx.friendlyError("Something went wrong. Please try again later.", "7nVqDXkrHG");
    }

    const messageTemplate = linkData.spoiler || spoiler ? "|| {url} ||" : "{url}";

    return ctx.reply(
        {
            content: messageTemplate.replace("{url}", qv_short_url),
            components: guildConfig.show_buttons
                ? [
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
                                  custom_id: `delete${ctx.authorID}`,
                              },
                          ],
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
        dmPermission: true,
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
        dmPermission: true,
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

        const description = cleanDescription(
            tiktokData.aweme_detail.desc,
            tiktokData.aweme_detail.text_extra
        );

        let embed: APIEmbed = {
            title: description.cleaned,
            description: "——————",
            color: 0x5865f2,
            author: {
                name: tiktokData.aweme_detail.author.nickname,
                icon_url: tiktokData.aweme_detail.author.avatar_thumb.url_list[0],
                url: `https://tiktok.com/@${tiktokData.aweme_detail.author.unique_id}`,
            },
            thumbnail: {
                url: tiktokData.aweme_detail.video.cover.url_list[0],
            },
            fields: [
                {
                    name: "Views 👀",
                    value: (+tiktokData.aweme_detail.statistics.play_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Likes ❤️",
                    value: (+tiktokData.aweme_detail.statistics.digg_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Comments 💬",
                    value: (+tiktokData.aweme_detail.statistics.comment_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Shares 🔃",
                    value: (+tiktokData.aweme_detail.statistics.share_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Downloads 📥",
                    value: (+tiktokData.aweme_detail.statistics.download_count).toLocaleString(),
                    inline: true,
                },
                {
                    name: "Created 🕰️",
                    value: `<t:${Math.floor(tiktokData.aweme_detail.create_time)}:R>`,
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
        console.log(usrFavorited);

        const whichFavBtn = usrFavorited ? "unfav" : "fav";

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
                                custom_id: `m_id${tiktokData.aweme_detail.music.mid}`,
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
