import {
    APIApplicationCommand,
    ApplicationCommandType,
    PermissionFlagsBits,
    RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import * as functions from "./Functions";
import Logger from "./Logger";
import { readdirSync } from "fs";
import Database from "./Database";
import TTRequester from "./TTRequester";
import InteractionContext from "./Context";
import InteractionCommand, { ContextMenu, SlashCommand } from "./ApplicationCommand";
import { AutocompleteContext } from "./CommandContext";

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
    commands: InteractionCommand[];
    database: Database;
    ttrequester: TTRequester;
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
        topggToken: string | undefined,
        ttrequester: TTRequester
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
        this.ttrequester = ttrequester;
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

    async handleCommand(ctx: InteractionContext) {
        const command = this.commands.find((c) => c.name === ctx.command.name);
        if (!command)
            return this.console.error(
                `Command ${ctx.command.name} was run with no corresponding command file.`
            );

        try {
            await command.run(ctx);
        } catch (err) {
            this.console.error(err);
        }
    }

    async handleAutocomplete(ctx: AutocompleteContext) {
        const commandName = ctx.data?.name;
        const command = this.commands.find((c) => c.name === commandName) as SlashCommand;
        if (!command)
            return this.console.error(
                `Command /${commandName} was run with no corresponding command file.`
            );

        try {
            if (command.autocompleteCallback) {
                await command.autocompleteCallback(ctx);
            } else {
                this.console.error(
                    `Command /${command.name} was run with no corresponding autocomplete function.`
                );
            }
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
        const globalCommands: InteractionCommand[] = [];
        const guildOnly: { [id: string]: InteractionCommand[] } = {};
        for (const commandFileName of commandFileNames) {
            const commandFile: InteractionCommand = this.functions.deepCopy(
                (await import(`../commands/${commandFileName}`)).default
            );
            this.console.log(`Loaded command ${commandFile.name}`);
            this.commands.push(commandFile);
            if (!commandFile.scopes || commandFile.scopes.length === 0) {
                globalCommands.push(commandFile);
            } else {
                commandFile.scopes.forEach((guildId) => {
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
                        ((await this.compareCommands(guildOnly[guildId], guildId))
                            ? "Changes detected"
                            : "No changes detected")
                );
            else await this.updateCommands(guildOnly[guildId], guildId);
        }
    }

    async updateCommands(commands: InteractionCommand[], guildId?: string) {
        if (!(await this.compareCommands(commands, guildId))) return;
        this.console.log("Updating commands...");

        const commandsData = commands.map(this.convertCommandToDiscordFormat).filter(Boolean);

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
                body: JSON.stringify(commandsData),
            }
        );

        this.console.success(`Updated ${commandsData.length} slash commands`);
    }
    async compareCommands(commands: InteractionCommand[], guildId?: string): Promise<boolean> {
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

            // Compare the fetched commands with the provided commands
            return commands.some((com) => {
                const matchingCommand = commandList.find((c) => c.name === com.name);
                if (!matchingCommand) {
                    return true; // Command doesn't exist in Discord
                }

                // Convert the provided command to Discord format for comparison
                const providedCommandData = this.convertCommandToDiscordFormat(com);

                if (!providedCommandData) {
                    return false; // Unable to convert provided command, consider it unchanged
                }

                // Compare only the fields that clients can change
                return (
                    providedCommandData.type !== matchingCommand.type ||
                    providedCommandData.dm_permission !== matchingCommand.dm_permission ||
                    providedCommandData.default_member_permissions !==
                        matchingCommand.default_member_permissions ||
                    providedCommandData.nsfw !== matchingCommand.nsfw
                );
            });
        } else {
            return false;
        }
    }

    convertCommandToDiscordFormat(command: InteractionCommand): any {
        if (command.type === ApplicationCommandType.ChatInput) {
            let _command = command as SlashCommand;
            return {
                type: _command.type,
                name: _command.name,
                description: _command.description || "No description set",
                options: _command.options,
                dm_permission: _command.dmPermission,
                nsfw: _command.nsfw ?? false,
                default_member_permissions: _command.defaultMemberPermissions.length
                    ? _command.defaultMemberPermissions
                          .map((perm) =>
                              typeof perm === "bigint" ? perm : PermissionFlagsBits[perm]
                          )
                          .reduce((a, c) => a | c, 0n)
                          .toString()
                    : null,
            };
        } else if (
            command.type === ApplicationCommandType.Message ||
            command.type === ApplicationCommandType.User
        ) {
            let _command = command as ContextMenu;
            return {
                type: _command.type,
                name: _command.name,
                dm_permission: _command.dmPermission,
                nsfw: _command.nsfw ?? false,
                default_member_permissions: _command.defaultMemberPermissions.length
                    ? _command.defaultMemberPermissions
                          .map((perm) =>
                              typeof perm === "bigint" ? perm : PermissionFlagsBits[perm]
                          )
                          .reduce((a, c) => a | c, 0n)
                          .toString()
                    : null,
            };
        }
        return null; // Handle other cases if needed
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

    getCommand(name: string) {
        return this.commands.find((c) => c.name === name);
    }
}
