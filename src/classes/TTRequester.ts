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

        const data = (await response.json()) as object | null;

        return data;
    }

    async fetchPostInfo(postId: string | number): Promise<any | Error> {
        let data: null | any = null;
        try {
            data = await this.request("GET", `/detail/post/${postId}`);
            if (!data) return null;

            if (data.status_code !== 0) {
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
            const videoUrl = data.aweme_detail.video.play_addr_h264.url_list.find((url: string) =>
                url.includes("tiktokv.com")
            );
            const fileId = getQueryParamValue(videoUrl, "file_id");
            const videUri = getQueryParamValue(videoUrl, "video_id");

            const shortUrl = await createShortUrl(postId, videUri, fileId);
            if (shortUrl) {
                data.aweme_detail.qv_short_url = shortUrl;
            }
        }

        return data;
    }
}
