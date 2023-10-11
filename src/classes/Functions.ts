import {
    RESTPostAPICurrentUserCreateDMChannelResult,
    RESTPostAPIChannelMessageJSONBody,
    RESTPatchAPIChannelMessageResult,
    RESTPostAPIChannelMessageResult,
    RESTGetAPIGuildChannelsResult,
    RESTGetAPIChannelResult,
    RESTGetAPIGuildResult,
    PermissionFlagsBits,
    RESTPatchAPIInteractionFollowupJSONBody,
} from "discord-api-types/v10";

import { RESTGetAPIApplicationEntitlementsResult } from "../types/premium";

import { GuildConfig, Shortener } from "../database/schema";
import { randomBytes } from "crypto";

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
    return await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
    }).then((res) => res.json());
}

export async function editMessage(
    data: RESTPostAPIChannelMessageJSONBody,
    channelId: string,
    messageId: string,
    token: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
    return await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
        headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
    }).then((res) => res.json());
}

export async function editInteractionResponse(
    data: RESTPatchAPIInteractionFollowupJSONBody,
    applicationId: string,
    interactionToken: string,
    messageId: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
    return await fetch(
        `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/${messageId}`,
        {
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }
    ).then((res) => res.json());
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
        return await response.json();
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
        return await response.json();
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
        return await response.json();
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
        return await response.json();
    } else {
        return null;
    }
}

export async function fetchApplicationEntitlements(
    guildId?: string,
    excludeEnded = true
): Promise<RESTGetAPIApplicationEntitlementsResult | null> {
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
        return await response.json();
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

enum MediaType {
    TikTokVideo = 1,
    TikTokImage = 2,
    TikTokMusic = 3,
    TikTokUser = 4,
    UNKNOWN = 5,
    InstagramReel = 6,
}

enum LinkIdType {
    LONG = 0,
    SHORT = 1,
    USER = 2,
}

type LinkData = {
    idType: LinkIdType;
    id: string | number;
    url: string;
    type: MediaType;
    spoiler: boolean;
    douyin: boolean;
};

type Pattern = [RegExp, MediaType];

const patterns: Pattern[] = [
    [
        /(?<http>http:|https:\/\/)?(www\.)?tiktok\.com\/(@.{1,24}|@[a-zA-Z0-9-_]{50,80})\/video\/(?<long_id>\d{1,30})/g,
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
        }
    } else {
        return link;
    }
    return link;
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
    const randomBytesBuffer: Buffer = randomBytes(6);
    const base64String: string = randomBytesBuffer.toString("base64");
    const urlSafeSlug: string = base64String.replace("+", "-").replace("/", "_").replace(/=+$/, "");

    return urlSafeSlug;
}

/**
 * Generated a QuickVids short url from a tiktok post
 * @param videoId The id of the tiktok.
 * @param videoUri The uri of the video.
 * @param fileId The id of the file.
 * @param douyin Whether the video is from douyin. (China tiktok)
 * @returns The shortened url.
 */
export async function createShortUrl(
    videoId: string,
    videoUri: string | null = "",
    fileId: string | null = "",
    douyin = false
): Promise<string> {
    const existingEntry = await Shortener.findOne({ video_id: videoId });
    if (existingEntry) {
        const url = `${process.env.WEB_BASE_URL}/${existingEntry.slug}`;
        return url;
    }

    let slug = generateSlug();

    while (await Shortener.findOne({ slug: slug })) {
        slug = generateSlug();
        console.log("slug collision, regenerating");
    }

    const shortener = new Shortener({
        slug: slug,
        video_id: videoId,
        file_id: fileId,
        video_uri: videoUri,
        douyin: douyin,
    });

    try {
        await shortener.save();
    } catch (err) {
        console.log(err);
        throw new Error("Failed to create short url");
    }

    const shortUrl = `${process.env.WEB_BASE_URL}/${shortener.slug}`;

    console.log(`Created short url for ${videoId} | ${shortUrl}`);
    return shortUrl;
}

export function getQueryParamValue(url: string, paramName: string): string | null {
    const match = url.match(new RegExp(`[?&]${paramName}=([^&]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
    const guild = await GuildConfig.findOne({ guild_id: guildId });
    if (guild) return guild;

    const newGuild = new GuildConfig({
        guild_id: guildId,
    });
    await newGuild.save();
    return newGuild;
}