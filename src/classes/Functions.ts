import {
    APIEntitlement,
    PermissionFlagsBits,
    RESTGetAPIChannelResult,
    RESTGetAPIEntitlementsResult,
    RESTGetAPIGuildChannelsResult,
    RESTGetAPIGuildResult,
    RESTPatchAPIChannelMessageResult,
    RESTPatchAPIInteractionFollowupJSONBody,
    RESTPostAPIChannelMessageJSONBody,
    RESTPostAPIChannelMessageResult,
    RESTPostAPICurrentUserCreateDMChannelResult,
} from "discord-api-types/v10";

import { Accounts, DiscordEmbedLogs, GuildConfig, Shortener } from "../database/schema";
import { SmartDescription, TextExtra } from "../types/tiktok";

export type Permission =
    | keyof typeof PermissionFlagsBits
    | (typeof PermissionFlagsBits)[keyof typeof PermissionFlagsBits];

export function hasPermission(permission: Permission, permissions?: string) {
    if (!permissions) return true;
    const required = typeof permission === "bigint" ? permission : PermissionFlagsBits[permission];
    const missing = required & ~BigInt(permissions);
    return !missing;
}

export function userTag({ username, discriminator }: { username: string; discriminator: string }) {
    return discriminator === "0" ? username : `${username}#${discriminator}`;
}

export function avatarURL({
    id,
    avatar,
    discriminator,
}: {
    id: string;
    avatar: string | null;
    discriminator: string;
}) {
    return (
        "https://cdn.discordapp.com/" +
        (avatar
            ? `avatars/${id}/${avatar}.${avatar.startsWith("_a") ? "gif" : "png"}`
            : `/embed/avatars/${Number(discriminator) % 5}.png`)
    );
}

export function deepEquals(obj1: any, obj2: any, ignoreList: string[] = []): boolean {
    return (
        typeof obj1 === typeof obj2 &&
        Array.isArray(obj1) === Array.isArray(obj2) &&
        (obj1 !== null && typeof obj1 === "object"
            ? Array.isArray(obj1)
                ? obj1.length === obj2.length &&
                  obj1.every((a, i) => deepEquals(a, obj2[i], ignoreList))
                : Object.keys(obj1).every((key) => {
                      return (
                          ignoreList.includes(key) ||
                          (key in obj2 && deepEquals(obj1[key], obj2[key], ignoreList))
                      );
                  })
            : obj1 === obj2)
    );
}

export function deepCopy<T>(obj: T): T {
    return (
        Array.isArray(obj)
            ? obj.map((a) => deepCopy(a))
            : typeof obj === "object" && obj !== null
            ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepCopy(v)]))
            : obj
    ) as T;
}

export function titleCase(str: string): string {
    return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

export async function sendMessage(
    data: RESTPostAPIChannelMessageJSONBody,
    channelId: string,
    token: string
): Promise<RESTPostAPIChannelMessageResult | null> {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (response.ok) {
        return (await response.json()) as RESTPostAPIChannelMessageResult;
    } else {
        return null;
    }
}

export async function editMessage(
    data: RESTPostAPIChannelMessageJSONBody,
    channelId: string,
    messageId: string,
    token: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
    const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${token}`,
            },
            body: JSON.stringify(data),
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTPatchAPIChannelMessageResult;
    } else {
        return null;
    }
}

export async function editInteractionResponse(
    data: RESTPatchAPIInteractionFollowupJSONBody,
    applicationId: string,
    interactionToken: string,
    messageId: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
    const response = await fetch(
        `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/${messageId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTPatchAPIChannelMessageResult;
    } else {
        return null;
    }
}

export async function createDMChannel(
    userId: string,
    token: string
): Promise<RESTPostAPICurrentUserCreateDMChannelResult | null> {
    const response = await fetch(
        `${process.env.DISCORD_API_URL || "https://discord.com"}/api/users/@me/channels`,
        {
            method: "POST",
            headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ recipient_id: userId }),
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTPostAPICurrentUserCreateDMChannelResult;
    } else {
        return null;
    }
}

export async function fetchGuild(
    guildId: string,
    token: string
): Promise<RESTGetAPIGuildResult | null> {
    const response = await fetch(
        `${process.env.DISCORD_API_URL || "https://discord.com"}/api/guilds/${guildId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bot ${token}`,
            },
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTGetAPIGuildResult;
    } else {
        return null;
    }
}

export async function fetchChannel(
    channelId: string,
    token: string
): Promise<RESTGetAPIChannelResult | null> {
    const response = await fetch(
        `${process.env.DISCORD_API_URL || "https://discord.com"}/api/channels/${channelId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bot ${token}`,
            },
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTGetAPIChannelResult;
    } else {
        return null;
    }
}

export async function fetchGuildChannels(
    guildId: string,
    token: string
): Promise<RESTGetAPIGuildChannelsResult | null> {
    const response = await fetch(
        `${process.env.DISCORD_API_URL || "https://discord.com"}/api/guilds/${guildId}/channels`,
        {
            method: "GET",
            headers: {
                Authorization: `Bot ${token}`,
            },
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTGetAPIGuildChannelsResult;
    } else {
        return null;
    }
}

export async function fetchApplicationEntitlements(
    guildId?: string,
    excludeEnded = true
): Promise<RESTGetAPIEntitlementsResult | null> {
    const response = await fetch(
        `${process.env.DISCORD_API_URL || "https://discord.com"}/api/applications/${
            process.env.APPLICATION_ID
        }/entitlements?${guildId ? `guild_id=${guildId}&` : ""}exclude_ended=${excludeEnded}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bot ${process.env.TOKEN}`,
            },
        }
    );

    if (response.ok) {
        return (await response.json()) as RESTGetAPIEntitlementsResult;
    } else {
        return null;
    }
}

// class MediaType(Enum):
//     TikTokVideo = 1
//     TikTokImage = 2
//     TikTokMusic = 3
//     TikTokUser = 4
//     UNKNOWN = 5
//     InstagramReel = 6
// This is an example from python

export enum MediaType {
    TikTokVideo = 1,
    TikTokImage = 2,
    TikTokMusic = 3,
    TikTokUser = 4,
    UNKNOWN = 5,
    InstagramReel = 6,
}

export enum LinkIdType {
    LONG = 0,
    SHORT = 1,
    USER = 2,
}

type LinkData = {
    idType: LinkIdType;
    id: string;
    url: string;
    type: MediaType;
    spoiler: boolean;
    douyin: boolean;
};

type Pattern = [RegExp, MediaType];

const patterns: Pattern[] = [
    [
        /(?<http>http:|https:\/\/)?(www\.)?tiktok\.com\/(@.{1,24}|@[a-zA-Z0-9-_]{50,80})\/(video|photo)\/(?<long_id>\d{1,30})/g,
        MediaType.TikTokVideo,
    ],
    [/(?<http>http:|https:\/\/)?(www\.)?tiktok.com\/t\/(?<short_id>\w{5,15})/g, MediaType.UNKNOWN],
    [
        /(?<http>http:|https:\/\/)?((?!ww)\w{2})\.tiktok.com\/(?<short_id>\w{5,15})/g,
        MediaType.UNKNOWN,
    ],
    [
        /(?<http>http:|https:\/\/)?(m\.|www\.)?tiktok\.com\/v\/(?<long_id>\d{1,30})/g,
        MediaType.TikTokVideo,
    ],
    [
        /(?<http>http:|https:\/\/)?(www)?\.tiktok\.com\/(.*)item_id=(?<long_id>\d{1,30})/g,
        MediaType.TikTokVideo,
    ],
    [
        /(?<http>http:|https:\/\/)?(www\.)?tiktok\.com\/music\/(([\w\-0-9]*)\-)?(?<long_id>\d{1,30})/g,
        MediaType.TikTokMusic,
    ],
    [
        /(?<http>http:|https:\/\/)?(www\.)?tiktok\.com\/(?<user_id>@[\w\d_\.]{1,24})/g,
        MediaType.TikTokUser,
    ],
    // [
    //     /(?<http>http:|https:\/\/)?(www\.)?douyin\.com\/video\/(?<long_id>\d{1,30})/g,
    //     MediaType.TikTokVideo,
    // ],
    // [
    //     /(?<http>http:|https:\/\/)?((?!ww)\w{1,2})\.douyin\.com\/(?<short_id>\w{5,15})/g,
    //     MediaType.TikTokVideo,
    // ],
    // [
    //     /(?<http>http:|https:\/\/)?(www\.)?iesdouyin\.com\/share\/video\/(?<long_id>\d{1,30})/g,
    //     MediaType.TikTokVideo,
    // ],
];

export async function fetchFullUrl(link: LinkData): Promise<LinkData> {
    if (link.idType != LinkIdType.SHORT) {
        return link;
    }
    const userAgent = "Wheregoes.com Redirect Checker/1.0";
    const shortUrl = `https://www.tiktok.com/t/${link.id}`;
    const response = await fetch(shortUrl, {
        headers: {
            "User-Agent": userAgent,
        },
        redirect: "manual",
    });
    if (response.status == 301 || response.status == 302) {
        const url = response.headers.get("location");
        if (!url) {
            return link;
        }
        const newLink = await checkForTikTokLink(url);
        if (!newLink) {
            return link;
        } else if (newLink.idType == LinkIdType.LONG) {
            return newLink;
        } else {
            return newLink;
        }
    } else {
        return link;
    }
}

export async function checkForTikTokLink(
    content: string,
    fetchLongUrl?: boolean | undefined
): Promise<LinkData | null> {
    for (const [pattern, type] of patterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
            const { long_id, short_id, user_id, http } = match.groups!;
            let url = match[0];
            if (!http) {
                url = "https://" + url;
            }

            let link: LinkData = {
                idType: long_id ? LinkIdType.LONG : short_id ? LinkIdType.SHORT : LinkIdType.USER,
                id: long_id || short_id || user_id,
                url,
                type,
                spoiler: false,
                douyin: false, // NOTE: Douyin support is disabled for now.
            };

            if (link.idType == LinkIdType.SHORT && fetchLongUrl) {
                link = await fetchFullUrl(link);
            }

            return link;
        }
    }
    return null;
}

function generateSlug(): string {
    const allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const slugLength = 8;

    let slug = "";
    for (let i = 0; i < slugLength; i++) {
        slug += allowedChars[Math.floor(Math.random() * allowedChars.length)];
    }

    return slug;
}



export function getQueryParamValue(url: string, paramName: string): string | null {
    const match = url.match(new RegExp(`[?&]${paramName}=([^&]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Retrieves the guild configuration for the specified guild ID. If the configuration does not exist, it will be created.
 * @param guildId The ID of the guild to retrieve the configuration for.
 * @returns A Promise that resolves to the GuildConfig object.
 */
export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
    const guild = await GuildConfig.findOne({ guild_id: guildId });
    if (guild) return guild;

    const newGuild = new GuildConfig({
        guild_id: guildId,
    });
    await newGuild.save();
    return newGuild;
}

// [
//     {
//       application_id: "900353078128173097",
//       consumed: false,
//       deleted: false,
//       ends_at: "2023-11-29T06:15:09.287681+00:00",
//       gift_code_flags: 0,
//       id: "1168070511918583818",
//       promotion_id: null,
//       sku_id: "1158862627401892000",
//       starts_at: "2023-10-29T06:15:09.287681+00:00",
//       subscription_id: "1168070501818703892",
//       type: 8,
//       user_id: "324352543612469258"
//     }
//   ]
import { HydratedDocument } from "mongoose";

export async function getAccount(
    userId: string,
    create: boolean = false
): Promise<HydratedDocument<Accounts> | null> {
    const account = await Accounts.findOne({ user_id: userId });
    if (account) return account;

    if (create) {
        const newAccount = new Accounts({
            user_id: userId,
        });
        await newAccount.save();
        return newAccount;
    }

    return null;
}

export async function verifyPremium(
    userId: string,
    entitlements: APIEntitlement[]
): Promise<boolean> {
    // check entitlements first, then the database
    const premiumEntitlements = entitlements.filter((entitlement) => entitlement.type === 8);

    if (premiumEntitlements.length > 0) {
        return true;
    }

    const user = await getAccount(userId, true);

    if (!user) {
        return false;
    }

    if (user.premium?.has_premium) {
        return true;
    }

    return false;
}

export async function checkExistingQVShortUrl(videoId: string): Promise<string | null> {
    const existingEntry = await Shortener.findOne({ aweme_id: videoId });
    if (existingEntry) {
        const url = `${process.env.WEB_BASE_URL}/${existingEntry.slug}`;
        return url;
    }

    return null;
}

/**
 * Cleans the description of a TikTok post by removing the hashtags and trimming the whitespace.
 * @param description The description to clean.
 * @param text_extra The text_extra array from the TikTok post.
 * @returns A SmartDescription object.
 */
export function cleanDescription(description: string, text_extra: TextExtra[]): SmartDescription {
    let cleaned = description;
    let hashtags: string[] = [];

    text_extra.forEach((hashtag) => {
        if (hashtag.type == 1) {
            //type 1 stands for hashtags in this context.
            const hashtagText = description.substring(hashtag.start, hashtag.end);
            cleaned = cleaned.replace(hashtagText, "").trim(); //replace the hashtags in description and trim the excessive whitespaces.
            hashtags.push(hashtag.hashtag_name);
        }
    });

    return {
        cleaned,
        raw: description,
        hashtags,
    };
}

export async function insertUserFavorite(
    userId: string,
    videoId: string
): Promise<boolean | Error> {
    await getAccount(userId, true); // NOTE: Saftey check to ensure the user exists in the database.
    const user = await Accounts.findOne({ user_id: userId });
    if (!user) {
        return new Error("Failed to find user in database.");
    }
    if (user.favorites === undefined) {
        user.favorites = [videoId];
        await user.save();
        return true;
    } else if (!user.favorites.includes(videoId)) {
        user.favorites.push(videoId);
        await user.save();
        return true;
    } else {
        return new Error("This video is already in your favorites.");
    }
}

export async function removeUserFavorite(
    userId: string,
    videoId: string
): Promise<boolean | Error> {
    await getAccount(userId, true); // NOTE: Saftey check to ensure the user exists in the database.
    const user = await Accounts.findOne({ user_id: userId });
    if (!user) {
        return new Error("Failed to find user in database.");
    }
    if (user.favorites === undefined) {
        return new Error("You have no favorites to remove.");
    } else if (user.favorites.includes(videoId)) {
        user.favorites = user.favorites.filter((id) => id !== videoId);
        await user.save();
        return true;
    } else {
        return new Error("This video is not in your favorites.");
    }
}

export async function checkUserFavorite(userId: string, videoId: string): Promise<boolean> {
    await getAccount(userId, true); // NOTE: Saftey check to ensure the user exists in the database.
    const user = await Accounts.findOne({ user_id: userId });
    if (!user) {
        return false;
    }
    if (user.favorites === undefined || user.favorites === null) {
        user.favorites = [];
        await user.save();
        return false;
    } else if (user.favorites.length === 0) {
        return false;
    } else {
        return user.favorites.includes(videoId);
    }

    return false;
}

export async function insertEmbedLog({
    guildId,
    channelId,
    videoId,
    userId,
    method,
}: {
    guildId: string | null;
    channelId: string;
    videoId: string;
    userId: string | null;
    method: number;
}): Promise<void> {
    let user;
    if (userId) {
        user = await getAccount(userId, true);
        if (user) {
            // NOTE: A user's logs are a list of ObjectIds, so we need to use a separate list for embed logs.
            if (user.log_usage_data !== undefined && user.log_usage_data === false) {
                userId = null;
            }
        }
    }

    const log = new DiscordEmbedLogs({
        method: method,
        guild_id: guildId,
        channel_id: channelId,
        tiktok_id: videoId,
        user_id: userId,
    });

    await log.save();

    if (userId && user) {
        if (!user.logs) {
            user.logs = [];
        }
        user.logs.push(log._id);
        await user.save();
    }
}
