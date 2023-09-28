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
