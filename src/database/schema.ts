import mongoose from "mongoose";

const shortenerSchema = new mongoose.Schema(
    {
        video_id: { type: Number, required: true, unique: true },
        file_id: { type: String, required: false, default: "" },
        video_uri: { type: String, required: false, default: "" },
        slug: { type: String, required: true, unique: true },
        douyin: { type: Boolean, required: false, default: false },
    },
    { collection: "Shortener", versionKey: false }
);

export type Shortener = mongoose.InferSchemaType<typeof shortenerSchema>;
export const Shortener = mongoose.model("Shortener", shortenerSchema);


const botStatsSchema = new mongoose.Schema(
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
