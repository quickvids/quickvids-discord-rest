import {
    APIApplicationCommand,
    APIApplicationCommandOption,
    ApplicationCommandType,
    PermissionFlagsBits,
    RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import * as functions from "./Functions";
import Logger from "./Logger";
import { readdirSync } from "fs";
import Database from "./Database";
import TTRequester from "./TTRequester";
import InteractionContext from "./CommandContext";
import { InteractionCommand, SlashCommand } from "./ApplicationCommand";
import { AutocompleteContext } from "./CommandContext";
import Extension from "./Extension";

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

        if (!command.callback)
            return this.console.error(
                `Command ${ctx.command.name} was run with no corresponding callback function.`
            );

        try {
            await command.callback(ctx);
        } catch (err) {
            this.console.error(err);
        }
    }

    async handleAutocomplete(ctx: AutocompleteContext) {
        const commandName = ctx.data?.name;
        const command = this.commands.find((c) => c.name === commandName) as SlashCommand;
        if (!command)
            return this.console.error(
                `Command /${commandName}'s autocomplete was run with no corresponding command file.`
            );

        try {
            await command.autocomplete(ctx);
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
        const commandFileNames = readdirSync(`${__dirname}/../extensions`).filter(
            (f) => f.endsWith(".ts") || f.endsWith(".js")
        );
        const globalCommands: InteractionCommand[] = [];
        const guildOnly: { [id: string]: InteractionCommand[] } = {};
        for (const commandFileName of commandFileNames) {
            const extension = new (
                await import(`../extensions/${commandFileName}`)
            ).default() as Extension;
            this.console.log(`Loaded command ${extension.name}`);
            this.commands.push(...extension.commands.values());

            for (const command of extension.commands.values()) {
                if (!command.scopes || command.scopes.length === 0) {
                    globalCommands.push(command);
                } else {
                    command.scopes.forEach((guildId) => {
                        if (!(guildId in guildOnly)) guildOnly[guildId] = [];
                        guildOnly[guildId].push(command);
                    });
                }
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

    /**
     * Compares the provided commands with the commands registered in Discord.
     * @param commands - The commands to compare.
     * @param guildId - The ID of the guild to compare the commands for. If not provided, compares global commands.
     * @returns A boolean indicating whether the provided commands match the commands registered in Discord. True if changes were detected, false otherwise.
     */
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
            // this.console.log(JSON.stringify(commands));
            // this.console.log(JSON.stringify(await response.json()));

            const commandList: APIApplicationCommand[] = await response.json();
            this.console.log(JSON.stringify(commandList));

            // Compare the fetched commands with the provided commands
            return commands.some((_internalCommand) => {
                const matchingCommand = commandList.find((c) => c.name === _internalCommand.name);
                if (!matchingCommand) {
                    return true; // Command doesn't exist in Discord
                }

                // Compare the options of the fetched command with the provided command
                const internalCommand = this.convertCommandToDiscordFormat(_internalCommand);

                if (internalCommand.type !== matchingCommand.type) {
                    this.console.log("Type is different");
                    return true;
                }

                if (internalCommand.dm_permission !== matchingCommand.dm_permission) {
                    this.console.log("dm_permission is different");
                    return true;
                }

                if (
                    internalCommand.default_member_permissions !==
                    matchingCommand.default_member_permissions
                ) {
                    this.console.log("default_member_permissions is different");
                    return true;
                }

                if (internalCommand.nsfw !== matchingCommand.nsfw) {
                    this.console.log("nsfw is different");
                    return true;
                }

                // check options only if not undefined in both
                if (
                    internalCommand.options !== undefined &&
                    matchingCommand.options !== undefined
                ) {
                    if (!this.areOptionsEqual(internalCommand.options, matchingCommand.options)) {
                        return true;
                    }
                }
            });
        } else {
            return false;
        }
    }

    convertCommandToDiscordFormat(command: InteractionCommand): any {
        let toReturn: any = {
            type: command.type,
            name: command.name,
            default_member_permissions: command.defaultMemberPermissions?.length
                ? command.defaultMemberPermissions
                      .map((perm) => (typeof perm === "bigint" ? perm : PermissionFlagsBits[perm]))
                      .reduce((a, c) => a | c, 0n)
                      .toString()
                : null,
        };

        if (command.type === ApplicationCommandType.ChatInput) {
            let _command = command as SlashCommand;

            toReturn.description = _command.description || "No description set";
            toReturn.nsfw = _command.nsfw ?? false;
            toReturn.dm_permission = _command.dmPermission;
            if (_command.options) {
                toReturn.options = _command.options;
            }

            return toReturn;
        } else if (
            command.type === ApplicationCommandType.Message ||
            command.type === ApplicationCommandType.User
        ) {
            // let _command = command as ContextMenu;
            // return {
            //     type: _command.type,
            //     name: _command.name,
            //     dm_permission: _command.dmPermission,
            //     nsfw: _command.nsfw ?? false,
            //     default_member_permissions: _command.defaultMemberPermissions.length
            //         ? _command.defaultMemberPermissions
            //               .map((perm) =>
            //                   typeof perm === "bigint" ? perm : PermissionFlagsBits[perm]
            //               )
            //               .reduce((a, c) => a | c, 0n)
            //               .toString()
            //         : null,
            // };
        }
        return null; // Handle other cases if needed
    }

    areOptionsEqual(
        options1: APIApplicationCommandOption[] | undefined,
        options2: APIApplicationCommandOption[] | undefined
    ): boolean {
        if (!options1 || !options2) {
            // If either set of options is undefined, they are not equal
            return false;
        }

        if (options1.length !== options2.length) {
            // If the lengths of the two sets of options are different, they are not equal
            console.log("Options are different lengths");
            return false;
        }

        // Compare arrays of objects
        const sortedOptions1 = options1.slice().sort();
        const sortedOptions2 = options2.slice().sort();

        for (let i = 0; i < sortedOptions1.length; i++) {
            if (!this.areObjectsEqual(sortedOptions1[i], sortedOptions2[i])) {
                return false;
            }
        }

        return true;
    }

    areObjectsEqual(obj1: any, obj2: any): boolean {
        // Compare two objects by sorting their keys and comparing values
        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();

        if (keys1.length !== keys2.length) {
            return false;
        }

        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }

        return true;
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
