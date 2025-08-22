import { EmbedEZ } from "embedez.ts";
import Client from "./classes/Client";
import Database from "./classes/Database";
import Server from "./classes/Server";
import TTRequester from "./classes/TTRequester";

export const {
    PORT,
    CLIENT_PUBLIC_KEY,
    APPLICATION_ID,
    DISCORD_TOKEN,
    MONGODB_URI,
    MONGODB_DBNAME,
    TOPGG_TOKEN,
    API_BASE_URL,
    QUICKVIDS_API_TOKEN,
    WEB_BASE_URL,
    GATEWAY_SECRET,
    EXTERNAL_TT_API_URL,
    EXTERNAL_TT_API_KEY,
} = process.env;

if (!PORT) throw new Error("PORT is not defined!");
if (!CLIENT_PUBLIC_KEY) throw new Error("CLIENT_PUBLIC_KEY is not defined!");
if (!APPLICATION_ID) throw new Error("APPLICATION_ID is not defined!");
if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is not defined!");
if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined!");
if (!MONGODB_DBNAME) throw new Error("MONGODB_DBNAME is not defined!");
if (!API_BASE_URL) throw new Error("API_BASE_URL is not defined!");
if (!QUICKVIDS_API_TOKEN) throw new Error("QUICKVIDS_API_TOKEN is not defined!");
if (!WEB_BASE_URL) throw new Error("WEB_BASE_URL is not defined!");
if (!GATEWAY_SECRET) throw new Error("GATEWAY_SECRET is not defined!");
if (!EXTERNAL_TT_API_URL) throw new Error("EXTERNAL_TT_API_URL is not defined!");
if (!EXTERNAL_TT_API_KEY) throw new Error("EXTERNAL_TT_API_KEY is not defined!");

const database = new Database(MONGODB_URI, MONGODB_DBNAME);
const ttrequester = new TTRequester(EXTERNAL_TT_API_KEY, EXTERNAL_TT_API_URL, true);

EmbedEZ.setConfig({
    apiKey: process.env.EZ_AUTH_TOKEN,
});

const client = new Client(
    APPLICATION_ID,
    DISCORD_TOKEN,
    CLIENT_PUBLIC_KEY,
    database,
    TOPGG_TOKEN,
    ttrequester
);

const server = new Server(parseInt(PORT), database, client);

server.start();

// Visitor Note: I would like to thank https://github.com/tandpfun/truth-or-dare/ for critical code used in this project.
