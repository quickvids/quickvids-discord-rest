import mongoose, { Schema, SchemaTypes } from "mongoose";
import mongooseLong from "mongoose-long";
import { EmbedMethod } from "../types/discord";

mongooseLong(mongoose);

export interface Shortener {
    slug: string;
    aweme_id: string;
    type: number;
    douyin: boolean;
    file_id: string;
    image_uris: string[];
    video_id: string;
    signaturev3: string;
}

const shortenerSchema = new Schema<Shortener>(
    {
        slug: { type: String, required: true, unique: true },
        aweme_id: { type: String, required: true, unique: true},
        type: { type: Number, required: false, default: 0},
        douyin: { type: Boolean, required: true, default: false },
        file_id: { type: String, required: false },
        image_uris: { type: [String], required: false },
        video_id: { type: String, required: false },
        signaturev3: { type: String, required: false },
    },
    { collection: "ShortenerNew", versionKey: false }
);


export const Shortener = mongoose.model<Shortener>("Shortener", shortenerSchema);

const botStatsSchema = new Schema(
    {
        ts: { type: Date, required: true, default: Date.now },
        server_count: { type: Number, required: true, default: 0 },
        total_users: { type: Number, required: true, default: 0 },
        total_embedded: { type: Number, required: true, default: 0 },
        embedded_today: { type: Number, required: true, default: 0 },
        embedded_past_24_hours: { type: Number, required: true, default: 0 },
    },
    { collection: "BotStats", versionKey: false }
);

export type BotStats = mongoose.InferSchemaType<typeof botStatsSchema>;
export const BotStats = mongoose.model("BotStats", botStatsSchema);

const webhookDataSchema = new Schema({
    id: { type: String, required: true },
    token: { type: String, required: true },
    channel_id: { type: String, required: true },
});

// Define the SingleFollowee schema
const singleFolloweeSchema = new Schema({
    channel_id: { type: String, required: true },
    creator: { type: String, required: true },
    role_id: { type: String, default: null },
    message: {
        type: String,
        default: "{{creator}} just posted a new video! {{role}}",
        validate: {
            validator: function (v: string) {
                const max_length = 150;
                return v.length <= max_length;
            },
            message: (props: { value: string }) =>
                `Message must be less than or equal to 150 characters. You have ${props.value.length} characters.`,
        },
    },
});

const mentionMagicSchema = new Schema({
    enabled: { type: Boolean, default: false },
    channel_id: { type: String, default: null },
});

// Define the WebhookData schema

const fourteenDays = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date;
};

const trialMessages = {
    messaged_owner: {
        success: { type: Boolean, default: false },
        error: { type: String, default: "" },
    },
    messaged_guild: {
        success: { type: Boolean, default: false },
        error: { type: String, default: "" },
    },
};

const guildConfigSchema = new Schema(
    {
        guild_id: { type: String, required: true, unique: true },
        following_cap: { type: Number, default: 3 }, // NOTE: 3 until the trial is over
        following_default_channel: { type: String, default: null },
        following_default_role: { type: String, default: null },
        auto_embed: { type: Boolean, default: true },
        origin_delete: { type: Boolean, default: false },
        origin_suppress: { type: Boolean, default: true },
        show_buttons: { type: Boolean, default: true },
        markdown_links: { type: Boolean, default: false },
        listen_channels: { type: [String], default: [] },
        mention_magic: mentionMagicSchema,
        webhooks: { type: [webhookDataSchema], default: [] },
        following_creators: { type: [singleFolloweeSchema], default: [] },
        trial: {
            active: { type: Boolean, default: false },
            start: { type: Date, default: Date.now },
            end: { type: Date, default: fourteenDays },
            messages: {
                start: trialMessages,
                mid: trialMessages,
                end: trialMessages,
            },
        },
        billing: {
            premium: { type: Boolean, default: false },
            manager: {
                user_id: { type: String, default: null },
                username: { type: String, default: null },
            },
        },
    },
    { collection: "GuildConfig", versionKey: false }
);

export type GuildConfig = mongoose.InferSchemaType<typeof guildConfigSchema>;
export const GuildConfig = mongoose.model<GuildConfig>("GuildConfig", guildConfigSchema);

const guildsSchema = new Schema(
    {
        guild_id: { type: String, required: true, unique: true },
        shard_id: { type: Number, required: false, default: null },
        name: { type: String, required: false, default: null },
        icon: { type: String, required: false, default: null },
        splash: { type: String, required: false, default: null },
        permissions: { type: Number, required: false, default: 0 },
        approx_member_count: { type: Number, required: false, default: 0 },
    },
    { collection: "Guilds", versionKey: false }
);

export type Guilds = mongoose.InferSchemaType<typeof guildsSchema>;
export const Guilds = mongoose.model<Guilds>("Guilds", guildsSchema);

const magicMentionUsersSchema = new Schema(
    {
        discord_id: { type: String, required: true, unique: true },
        tt_sec_uid: { type: String, required: true, unique: true },
        tt_uid: { type: String, required: true, unique: true },
        guilds_to_notify: { type: [String], default: [] },
    },
    { collection: "MagicMentionUsers", versionKey: false }
);

export type MagicMentionUsers = mongoose.InferSchemaType<typeof magicMentionUsersSchema>;
export const MagicMentionUsers = mongoose.model<MagicMentionUsers>(
    "MagicMentionUsers",
    magicMentionUsersSchema
);

const accountsSchema = new Schema(
    {
        user_id: { type: String, required: true, unique: true },
        access_token: { type: String, required: false, default: null },
        refresh_token: { type: String, required: false, default: null },
        scopes: { type: [String], required: false, default: null },
        premium: {
            has_premium: { type: Boolean, required: false, default: false },
            expires_at: { type: Date, required: false, default: null },
            customer_id: { type: String, required: false, default: null },
            subscription_id: { type: String, required: false, default: null },
            payment_failed: { type: Boolean, required: false, default: false },
            last_webhook: { type: Date, required: false, default: null },
            stat_reset_date: { type: Date, required: false, default: null },
            stat_gens_left: { type: Number, required: false, default: 0 },
        },
        favorites: { type: [String], required: false, default: null },
        log_usage_data: { type: Boolean, required: false, default: true }, // If we create personal identifiable data
        logs: { type: [SchemaTypes.ObjectId], required: false, default: [] },
    },
    { collection: "Accounts", versionKey: false }
);

export type Accounts = mongoose.InferSchemaType<typeof accountsSchema>;
export const Accounts = mongoose.model<Accounts>("Accounts", accountsSchema);

const discordEmbedLogsSchema = new Schema(
    {
        method: { type: Number, required: true, default: EmbedMethod.Gateway },
        user_id: { type: String, required: false, default: null },
        guild_id: { type: String, required: false, default: null },
        channel_id: { type: String, required: true, default: "unknown" },
        tiktok_id: { type: String, required: true }, // TikTok Video ID
        ts: { type: Date, required: true, default: Date.now },
    },
    { collection: "DiscordEmbedLogs", versionKey: false }
);

export type DiscordEmbedLogs = mongoose.InferSchemaType<typeof discordEmbedLogsSchema>;
export const DiscordEmbedLogs = mongoose.model<DiscordEmbedLogs>(
    "DiscordEmbedLogs",
    discordEmbedLogsSchema
);
