import mongoose, { Document, Schema, SchemaTypes, Model } from "mongoose";
import mongooseLong from "mongoose-long";

mongooseLong(mongoose);
const Long = Schema.Types.Long;

const shortenerSchema = new Schema(
    {
        video_id: { type: Long, required: true, unique: true },
        file_id: { type: String, required: false, default: "" },
        video_uri: { type: String, required: false, default: "" },
        slug: { type: String, required: true, unique: true },
        douyin: { type: Boolean, required: false, default: false },
    },
    { collection: "Shortener", versionKey: false }
);

export type Shortener = mongoose.InferSchemaType<typeof shortenerSchema>;
export const Shortener = mongoose.model("Shortener", shortenerSchema);

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
    id: { type: Long, required: true },
    token: { type: String, required: true },
    channel_id: { type: Long, required: true },
});

// Define the SingleFollowee schema
const singleFolloweeSchema = new Schema({
    channel_id: { type: Long, required: true },
    creator: { type: Long, required: true },
    role_id: { type: Long, default: null },
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
    channel_id: { type: Long, default: null },
});

// Define the WebhookData schema

const guildConfigSchema = new Schema(
    {
        guild_id: { type: Long, required: true, unique: true },
        following_cap: { type: Number, default: 3 },
        following_default_channel: { type: Number, default: null },
        following_default_role: { type: Number, default: null },
        auto_embed: { type: Boolean, default: true },
        origin_delete: { type: Boolean, default: false },
        origin_suppress: { type: Boolean, default: true },
        show_buttons: { type: Boolean, default: true },
        listen_channels: { type: [Number], default: [] },
        mention_magic: mentionMagicSchema,
        webhooks: { type: [webhookDataSchema], default: [] },
        following_creators: { type: [singleFolloweeSchema], default: [] },
    },
    { collection: "GuildConfig", versionKey: false }
);

export type GuildConfig = mongoose.InferSchemaType<typeof guildConfigSchema>;
export const GuildConfig = mongoose.model<GuildConfig>("GuildConfig", guildConfigSchema);
