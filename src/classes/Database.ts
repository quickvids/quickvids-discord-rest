import mongoose, { type Mongoose } from "mongoose";
import { BotStats } from "../database/schema";
import Logger from "./Logger";

export default class Database {
    console: Logger;
    mongoURI: string;
    dbName: string;
    db: Mongoose;

    constructor(mongoURI: string, dbName: string) {
        this.console = new Logger("DB");
        this.mongoURI = mongoURI;
        this.db = mongoose;
        this.dbName = dbName;
    }

    async start() {
        this.console.info("Connecting to MongoDB...");
        this.db = await this.db.connect(this.mongoURI, {
            dbName: this.dbName,
        });
        this.console.info("Connected to MongoDB!");
    }

    // bot_stats = await BotStats.find().sort(-BotStats.ts).limit(1).to_list()
    async getBotStats(): Promise<BotStats> {
        const stats = await BotStats.find().sort("-ts").limit(1).exec();
        return stats[0];
    }

    async getDatabasePing(): Promise<number> {
        const start = Date.now();
        await this.db.connection.db.command({ ping: 1 });
        return Date.now() - start;
    }
}
