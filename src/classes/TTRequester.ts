import { parse } from "lossless-json";
import { createShortUrl, getQueryParamValue } from "./Functions";
import Logger from "./Logger";

export default class TTRequester {
    apiKey: string;
    apiUrlBase: string;
    createShortUrls: boolean;
    console: Logger;

    constructor(apiKey: string, apiUrlBase: string, createShortUrl = false) {
        this.apiKey = apiKey;
        this.apiUrlBase = `${apiUrlBase}/v1/tiktok`;
        this.createShortUrls = createShortUrl;
        this.console = new Logger("TTRequester");
    }

    async request(
        method: "GET" | "POST",
        endpoint: string,
        body?: any,
        headers: object = {}
    ): Promise<any | null> {
        const url = this.apiUrlBase + endpoint;
        const reqHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...headers,
        };
        const reqBody = body ? JSON.stringify(body) : undefined;

        this.console.log(`Sending ${method} request to ${url}`);

        const response = await fetch(url, {
            method,
            headers: reqHeaders,
            body: reqBody,
        });

        if (!response.ok) {
            throw new Error(`Request to ${url} failed with status code ${response.status}`);
        }

        const text = await response.text();

        return parse(text);
    }

    async fetchPostInfo(postId: string | number): Promise<any | Error> {
        let data: null | any = null;
        try {
            data = await this.request("GET", `/detail/post/${postId}`);
            if (!data) return null;

            if (data.status_code.value !== "0") {
                const error_code = "DbrqXPgP4G";
                return new Error(
                    `Sorry, there was an error fetching that tiktok post. Please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``
                );
            }

            if (!data.aweme_detail) {
                const error_code = "QNkBD4zzzA";
                return new Error(
                    `This TikTok is not available.\n\nThis could be because the TikTok was deleted, the owner of the TikTok has a private account, or the TikTok is under review.\n\nIf you believe this is a mistake, please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``
                );
            }
        } catch (e) {
            this.console.error(e);
            const error_code = "WrkKanvMfC";
            return new Error(
                `Sorry, there was an error fetching that tiktok post. Please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``
            );
        }

        if (this.createShortUrls) {
            // string of post id
            if (typeof postId === "number") {
                postId = postId.toString();
            }
            // if image_post_info do no create short url
            if (data.aweme_detail.image_post_info !== undefined) {
                return data;
            }

            // data.aweme_detail.video.play_addr_h264.url_list
            // get the file_id from the url_list (get the url with "tiktokv.com" in it")
            // const videoUrl = data.aweme_detail.video.play_addr_h264.url_list[2];

            // check if play_addr_h264 is undefined
            let videoUrl: string;
            if (data.aweme_detail.video.play_addr_h264 === undefined) {
                videoUrl = data.aweme_detail.video.download_addr.url_list.find((url: string) =>
                    (url.includes("tiktokv.com") || url.includes("tiktokv.us"))
                );
            } else {
                videoUrl = data.aweme_detail.video.play_addr_h264.url_list.find((url: string) =>
                    (url.includes("tiktokv.com") || url.includes("tiktokv.us"))
                );
            }

            const fileId = getQueryParamValue(videoUrl, "file_id");
            const videUri = getQueryParamValue(videoUrl, "video_id");

            const shortUrl = await createShortUrl(postId, videUri, fileId);
            if (shortUrl) {
                data.aweme_detail.qv_short_url = shortUrl;
            }
        }

        return data;
    }

    async fetchMusicInfo(musicId: string | number): Promise<any | null> {
        this.console.log(`Fetching music info | Music ID: ${musicId}`);
        let data: null | any = null;
        try {
            data = await this.request("GET", `/detail/music/${musicId}`);

            if (!data) return null;

            if (data.status_code.value !== "0") {
                const error_code = "pReXfwMbne";
                return new Error(
                    `Sorry, there was an error fetching that tiktok audio. Please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``
                );
            }

            if (data.music_info === undefined) {
                const error_code = "U2vsXKHawj";
                return new Error(
                    `This TikTok audio is not available.\n\nThis could be because the TikTok audio was deleted, the owner of the TikTok audio has a private account, or the TikTok audio is under review.\n\nIf you believe this is a mistake, please join the support server for help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``
                );
            }
        } catch (e) {
            this.console.error(`Failed to fetch music info: ${musicId} | ${e}`);
            return null;
        }

        return data;
    }

    async fetchUserIds(uniqueId: string): Promise<{ uid: string; secUid: string } | null> {
        this.console.log(`Fetching user ids | Unique ID: ${uniqueId}`);
        let data: null | any = null;
        try {
            data = await this.request("POST", "/user/ids", { unique_id: uniqueId });
        } catch (e) {
            this.console.error(`Failed to fetch user ids: ${uniqueId} | ${e}`);
            return null;
        }

        if (!data.uid) {
            return null;
        }
        this.console.log(`Fetched user ids | Unique ID: ${uniqueId} | UID: ${data.uid}`);
        return {
            uid: String(data.uid),
            secUid: data.sec_uid,
        };
    }

    // async def fetch_user(self, user_id: str | int = None, sec_uid: str = None, unique_id: str = None, *, timeout: float | int = None) -> User:
    // if user_id is None and sec_uid is None and unique_id is None:
    //     raise ValueError("user_id or sec_uid must be provided")

    // if unique_id is not None:
    //     user_id, sec_uid = await self.fetch_users_ids(unique_id, timeout=timeout)

    // id = user_id or sec_uid or unique_id
    // self.logger.debug(f"Fetching user | ID: {id}")
    // try:
    //     data = await self.request("GET", f"/user/{id}", timeout=timeout)
    // except Exception as e:
    //     self.logger.error(f"Failed to fetch user: {user_id or sec_uid or unique_id}", exc_info=e)
    //     return None

    // return User.from_dict(data["user"])

    async fetchUser(
        userId: string | null,
        secUid: string | null,
        uniqueId: string | null
    ): Promise<any | null> {
        if (!userId && !secUid && !uniqueId) {
            throw new Error("user_id or sec_uid must be provided");
        }

        if (uniqueId) {
            const userIds = await this.fetchUserIds(uniqueId);
            if (!userIds) return null;
            userId = userIds.uid;
            secUid = userIds.secUid;
        }

        const id = userId || secUid;
        this.console.log(`Fetching user | ID: ${id}`);
        let data: null | any = null;
        try {
            data = await this.request("GET", `/user/${id}`);
        } catch (e) {
            this.console.error(`Failed to fetch user: ${userId || secUid || uniqueId} | ${e}`);
            return null;
        }

        return data.user;
    }
}
