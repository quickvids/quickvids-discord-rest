import mongoose from "mongoose";
import { type Mongoose, type Model } from "mongoose";
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
}
