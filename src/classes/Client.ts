import {
    APIApplicationCommand,
    PermissionFlagsBits,
    RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import Command, { ApplicationCommandContext } from "./Command";
import CommandContext from "./CommandContext";
import * as functions from "./Functions";
import Logger from "./Logger";
import { readdirSync } from "fs";
import Database from "./Database";

type BotVote = {
    points: number;
    monthlyPoints: number;
};

export default class Client {
    id: string;
    token: string;
    publicKey: string;
    discordAPIUrl: string;
    functions: typeof functions;
    commands: Command[];
    database: Database;
    console: Logger;
    topggToken: string | null;

    static COLORS = {
        WHITE: 0xffffff,
        BLURPLE: 0x5865f2,
        GREYPLE: 0x99aab5,
        DARK_BUT_NOT_BLACK: 0x2c2f33,
        NOT_QUITE_BLACK: 0x23272a,
        GREEN: 0x57f287,
        YELLOW: 0xfee75c,
        FUSCHIA: 0xeb459e,
        RED: 0xed4245,
        BLACK: 0xffffff,
        BLUE: 0x3498db,
    } as const;
    static EMOTES = {
        first_button: "<:first:1002702500345950248>",
        last_button: "<:last:1002702499125403698>",
        next_button: "<:next:1002702497200218204>",
        back_button: "<:back:1002702496294240328>",
        topgg: "<:topgg:918280202398875758>",
        qv_heart: "<:quickvids_heart:1002702497992941659>",
    } as const;

    constructor(
        id: string,
        token: string,
        publicKey: string,
        database: Database,
        topggToken: string | undefined
    ) {
        this.id = id;
        this.token = token;
        this.publicKey = publicKey;
        this.discordAPIUrl = `https://discord.com/api/v10`;
        this.functions = functions;
        this.commands = [];
        this.console = new Logger("Client");
        this.database = database;
        this.topggToken = topggToken || null;
    }

    get COLORS() {
        return Client.COLORS;
    }
    get EMOTES() {
        return Client.EMOTES;
    }

    get inviteUrl() {
        return `https://discord.com/oauth2/authorize?client_id=${this.id}&permissions=60416&scope=bot%20applications.commands`;
    }

    async getTopggVotes(): Promise<BotVote | null> {
        if (!this.topggToken) return null;
        const response = await fetch(`https://top.gg/api/bots/${this.id}`, {
            method: "GET",
            headers: {
                Authorization: this.topggToken,
            },
        });

        if (response.ok) {
            const data = await response.json();
            this.console.log(data);
            return data as BotVote;
        } else {
            return null;
        }
    }

    async handleCommand(ctx: CommandContext) {
        const command = this.commands.find((c) => c.name === ctx.command.name);
        if (!command)
            return this.console.error(
                `Command ${ctx.command.name} was run with no corresponding command file.`
            );
        if (!this.functions.checkPerms(command, ctx)) return;

        try {
            await command.run(ctx);
        } catch (err) {
            this.console.error(err);
        }
    }

    async start() {
        this.console.log(`Using API URL: ${this.discordAPIUrl}`);
        await this.loadCommands();
        this.console.success(`Loaded ${this.commands.length} commands!`);
    }

    async loadCommands() {
        const commandFileNames = readdirSync(`${__dirname}/../commands`).filter(
            (f) => f.endsWith(".ts") || f.endsWith(".js")
        );
        const globalCommands: Command[] = [];
        const guildOnly: { [id: string]: Command[] } = {};
        for (const commandFileName of commandFileNames) {
            const commandFile: Command = this.functions.deepCopy(
                (await import(`../commands/${commandFileName}`)).default
            );
            if (typeof commandFile.default_member_permissions === "undefined")
                commandFile.default_member_permissions = commandFile.perms
                    .length
                    ? commandFile.perms
                          .map((perm) =>
                              typeof perm === "bigint"
                                  ? perm
                                  : PermissionFlagsBits[perm]
                          )
                          .reduce((a, c) => a | c, 0n)
                          .toString()
                    : null;
            if (typeof commandFile.contexts === "undefined")
                commandFile.contexts = [
                    ApplicationCommandContext.Guild,
                    ApplicationCommandContext.BotDM,
                    // ApplicationCommandContext.PrivateChannel,
                ]; // Enables for guilds and bot-user DMs by default
            this.commands.push(commandFile);
            if (!commandFile.guildId) {
                globalCommands.push(commandFile);
            } else {
                commandFile.guildId.forEach((guildId) => {
                    if (!(guildId in guildOnly)) guildOnly[guildId] = [];
                    guildOnly[guildId].push(commandFile);
                });
            }
        }

        const devMode = process.argv.includes("dev");
        if (devMode)
            this.console.log(
                "Global Commands: " +
                    ((await this.compareCommands(globalCommands))
                        ? "Changes detected"
                        : "No changes detected")
            );
        else await this.updateCommands(globalCommands);

        for (const guildId in guildOnly) {
            if (devMode)
                this.console.log(
                    `GuildOnly Commands (${guildId}): ` +
                        ((await this.compareCommands(
                            guildOnly[guildId],
                            guildId
                        ))
                            ? "Changes detected"
                            : "No changes detected")
                );
            else await this.updateCommands(guildOnly[guildId], guildId);
        }
    }

    async compareCommands(
        commands: Command[],
        guildId?: string
    ): Promise<boolean> {
        const response = await fetch(
            `${this.discordAPIUrl}/applications/${this.id}${
                guildId ? `/guilds/${guildId}` : ""
            }/commands`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bot ${this.token}`,
                },
            }
        );
        if (response.ok) {
            const commandList: APIApplicationCommand[] = await response.json();
            return commands.some(
                (com) =>
                    !this.functions.deepEquals(
                        com,
                        commandList.find((c) => c.name === com.name),
                        ["category", "perms", "run", "guildId"]
                    )
            );
        } else {
            return false;
        }
    }

    async updateCommands(commands: Command[], guildId?: string) {
        if (!(await this.compareCommands(commands, guildId))) return;
        this.console.log("Updating commands...");

        await fetch(
            `${this.discordAPIUrl}/applications/${this.id}${
                guildId ? `/guilds/${guildId}` : ""
            }/commands`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bot ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    commands.map((c) => ({
                        ...c,
                        perms: undefined,
                        guild_id: guildId,
                    }))
                ),
            }
        );

        this.console.success(`Updated ${this.commands.length} slash commands`);
    }

    async webhookLog(type: string, data: RESTPostAPIWebhookWithTokenJSONBody) {
        await fetch(process.env[type.toUpperCase() + "_HOOK"] ?? "", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }).catch((_) => null);
    }
}
