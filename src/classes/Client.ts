import {
    APIApplicationCommand,
    APIApplicationCommandOption,
    APIButtonComponentWithURL,
    ApplicationCommandType,
    PermissionFlagsBits,
    RESTPostAPIWebhookWithTokenJSONBody
} from "discord-api-types/v10";
import { readdirSync } from "fs";
import { WEB_BASE_URL } from "..";
import { Guilds } from "../database/schema";
import { ContextMenuCommand, InteractionCommand, SlashCommand } from "./ApplicationCommand";
import { AutocompleteContext, ContextMenuContext, SlashCommandContext } from "./CommandContext";
import { ButtonContext, ComponentCallback, ModalContext } from "./ComponentContext";
import Database from "./Database";
import Extension from "./Extension";
import * as functions from "./Functions";
import Logger from "./Logger";
import TTRequester from "./TTRequester";

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
    componentCallbacks: ComponentCallback[];
    database: Database;
    ttrequester: TTRequester;
    topggToken: string | null;
    rawCommands: APIApplicationCommand[] = [];

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
        this.componentCallbacks = [];
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
            console.log(data);
            return data as BotVote;
        } else {
            return null;
        }
    }

    async checkUserTopGGVote(userId: string): Promise<boolean | null> {
        if (!this.topggToken) return null;
        const response = await fetch(`https://top.gg/api/bots/${this.id}/check?userId=${userId}`, {
            method: "GET",
            headers: {
                Authorization: this.topggToken,
            },
        });

        if (response.ok) {
            const data = (await response.json()) as { voted: 0 | 1 };
            if (data.voted === 1) {
                return true;
            }
            return false;
        } else {
            return null;
        }
    }

    async handleCommand(ctx: ContextMenuContext | SlashCommandContext) {
        const command = this.commands.find((c) => c.name === ctx.command.name);
        if (!command)
            return console.error(
                `Command ${ctx.command.name} was run with no corresponding command file.`
            );

        if (!command.callback)
            return console.error(
                `Command ${ctx.command.name} was run with no corresponding callback function.`
            );

        try {
            await command.callback(ctx);
        } catch (err) {
            console.error(err);
            // console.error(err);
            const error_code = "hDFPRERTpb";
            await ctx.reply(
                `Uh oh. An unepected error occured. Please join our [Support Server](<https://discord.gg/${error_code}>) and report this error.\n\nError Code: \`${error_code}\``,
                { ephemeral: true }
            );
        }
    }

    async handleAutocomplete(ctx: AutocompleteContext) {
        const commandName = ctx.data?.name;
        const command = this.commands.find((c) => c.name === commandName) as SlashCommand;
        if (!command)
            return console.error(
                `Command /${commandName}'s autocomplete was run with no corresponding command file.`
            );

        try {
            await command.autocomplete(ctx);
        } catch (err) {
            console.error(err);
        }
    }

    async handleButton(ctx: ButtonContext) {
        const callback = this.getComponentCallback(ctx.custom_id) as ComponentCallback;
        if (!callback || !callback.callback)
            return console.error(
                `Button ${ctx.custom_id} was run with no corresponding callback function.`
            );

        try {
            await callback.callback(ctx);
        } catch (err) {
            console.error(err);
        }
    }

    async handleModal(ctx: ModalContext) {
        const callback = this.getComponentCallback(ctx.custom_id) as ComponentCallback;
        if (!callback || !callback.callback)
            return console.error(
                `Modal ${ctx.custom_id} was run with no corresponding callback function.`
            );

        try {
            await callback.callback(ctx);
        } catch (err) {
            console.error(err);
        }
    }

    async start() {
        console.log(`Using API URL: ${this.discordAPIUrl}`);
        await this.loadCommands();
        console.log(`Loaded ${this.commands.length} commands!`);
    }

    async loadCommands() {
        const commandFileNames = readdirSync(`${import.meta.dirname}/../extensions`).filter(
            (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.startsWith("_")
        );
        const globalInteractions: InteractionCommand[] = [];
        const guildInteractions: { [id: string]: InteractionCommand[] } = {};
        for (const commandFileName of commandFileNames) {
            const extension = new (
                await import(`../extensions/${commandFileName}`)
            ).default() as Extension;
            console.log(`Loaded command ${extension.name}`);
            this.commands.push(...extension.commands.values());
            console.log(`Loaded ${extension.components} components`);
            this.componentCallbacks.push(...extension.components.values());

            for (const command of extension.commands.values()) {
                if (!command.scopes || command.scopes.length === 0) {
                    globalInteractions.push(command);
                } else {
                    command.scopes.forEach((guildId) => {
                        if (!(guildId in guildInteractions)) guildInteractions[guildId] = [];
                        guildInteractions[guildId].push(command);
                    });
                }
            }
        }

        console.log(JSON.stringify(globalInteractions));

        await this.updateCommands(globalInteractions);

        return
        const devMode = process.argv.includes("dev");
        if (devMode)
            console.log(
                "Global Commands: " +
                    ((await this.compareCommands(globalInteractions))
                        ? "Changes detected"
                        : "No changes detected")
            );
        else await this.updateCommands(globalInteractions);

        for (const guildId in guildInteractions) {
            if (devMode)
                console.log(
                    `guildInteractions Commands (${guildId}): ` +
                        ((await this.compareCommands(guildInteractions[guildId], guildId))
                            ? "Changes detected"
                            : "No changes detected")
                );
            else await this.updateCommands(guildInteractions[guildId], guildId);
        }

        // propogate the id field to the commands
        for (const command of this.commands) {
            command.id = this.rawCommands.find((c) => c.name === command.name)?.id;
        }
    }

    loadComponentCallbacks() {}

    async updateCommands(commands: InteractionCommand[], guildId?: string) {
        // console.log("paused");
        // return
        // if (!(await this.compareCommands(commands, guildId))) return;
        console.log("Updating commands...");

        const commandsData = commands.map(this.convertCommandToDiscordFormat).filter(Boolean);

        const newCommands = await fetch(
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

        if (!newCommands.ok) {
            console.error(
                `Failed to update ${
                    commandsData.length
                } slash commands: ${await newCommands.text()}`
            );
            return;
        } else {
            const newCommandsData = (await newCommands.json()) as APIApplicationCommand[];
            this.rawCommands = newCommandsData;
        }

        console.log(`Updated ${commandsData.length} slash commands`);
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
            // console.log(JSON.stringify(commands));
            // console.log(JSON.stringify(await response.json()));

            const commandList = (await response.json()) as APIApplicationCommand[];
            this.rawCommands = commandList;
            console.log(JSON.stringify(commandList));

            // Compare the fetched commands with the provided commands
            return commands.some((_internalCommand) => {
                const matchingCommand = commandList.find((c) => c.name === _internalCommand.name);
                if (!matchingCommand) {
                    return true; // Command doesn't exist in Discord
                }

                // Compare the options of the fetched command with the provided command
                const internalCommand = this.convertCommandToDiscordFormat(_internalCommand);

                if (internalCommand.type !== matchingCommand.type) {
                    console.log("Type is different");
                    return true;
                }

                if (internalCommand.dm_permission !== matchingCommand.dm_permission) {
                    console.log("dm_permission is different");
                    return true;
                }

                if (
                    internalCommand.default_member_permissions !==
                    matchingCommand.default_member_permissions
                ) {
                    console.log("default_member_permissions is different");
                    return true;
                }

                if (internalCommand.nsfw !== matchingCommand.nsfw) {
                    console.log("nsfw is different");
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

        if (command.integration_types && command.integration_types.length > 0) {
            toReturn.integration_types = command.integration_types;
        }

        if (command.contexts && command.contexts.length > 0) {
            toReturn.contexts = command.contexts;
        }

        if (command.type === ApplicationCommandType.ChatInput) {
            let _command = command as SlashCommand;

            toReturn.description = _command.description || "No description set";
            toReturn.nsfw = _command.nsfw ?? false;
            if (_command.options) {
                toReturn.options = _command.options;
            }

            return toReturn;
        } else if (command.type === ApplicationCommandType.User) {
            return null;
        } else if (command.type === ApplicationCommandType.Message) {
            let _command = command as ContextMenuCommand;

            toReturn.nsfw = _command.nsfw ?? false;

            return toReturn;
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

    getComponentCallback(custom_id: string) {
        return this.componentCallbacks.find((c) => c.custom_id.test(custom_id));
    }

    /**
     * Get's a basic guild data from the database.
     * @param guildId - The ID of the guild to get the data for.
     */
    async getGuild(guildId: string): Promise<Guilds | null> {
        const guild = await Guilds.findOne({ guild_id: guildId });
        return guild;
    }

    /**
     * Displays a premium ad and prompts the user to upgrade to QuickVids Premium.
     * If the user has already paid for premium, returns true.
     * If the user has voted on top.gg and `topgg_can_count` is true, returns true.
     * Otherwise, displays a premium ad with a link to upgrade to QuickVids Premium.
     * If `topgg_can_count` is true, also includes a button to vote on top.gg to unlock the command for 12 hours.
     * @param ctx The context of the command.
     * @param topgg_can_count Whether or not the user can unlock the command by voting on top.gg.
     * @returns A Promise that resolves to true if the user has paid for premium or voted on top.gg (if `topgg_can_count` is true), and false otherwise.
     */
    async command_premium_wall(
        ctx: SlashCommandContext | ContextMenuContext | ButtonContext,
        topgg_can_count: boolean = false
    ): Promise<boolean> {
        const userPaidPremium = await functions.verifyPremium(ctx.authorID, ctx.entitlements || []);
        if (userPaidPremium) return true;

        if (topgg_can_count) {
            const topggPremium = await this.checkUserTopGGVote(ctx.authorID);

            if (topggPremium) {
                if (topgg_can_count) return true;
            } else if (topggPremium === null) {
                console.warn(`Failed to check if ${ctx.authorID} voted on top.gg`);
                if (topgg_can_count) return true;
            }
        }

        const premiumAd = `Unlock the full power of QuickVids with QuickVids Personal Premium! This exclusive feature is reserved for our Premium users. You can easily upgrade to QuickVids Premium through our [website](${WEB_BASE_URL}/premium) or directly within Discord via [App Subscriptions](https://discord.com/application-directory/${this.id}/premium).\n\nBy subscribing to QuickVids Premium, you not only gain access to this exclusive command but also support our mission to keep the bot running smoothly. And the best part? **It's just $3 a month!**`;

        const embed = {
            title: "QuickVids Premium",
            description: premiumAd,
            color: Client.COLORS.YELLOW,
            footer: { text: "Prefered purchase method is through the website." },
        };

        if (topgg_can_count) {
            embed.description += `\n\nYou can also vote for QuickVids on [top.gg](https://top.gg/bot/${this.id}/vote) to unlock this command for 12 hours.`;
        }

        const buttons: APIButtonComponentWithURL[] = [];

        if (topgg_can_count) {
            buttons.push({
                type: 2,
                label: "Vote on top.gg",
                style: 5,
                url: `https://top.gg/bot/${this.id}/vote`,
                emoji: {
                    name: "topgg",
                    id: "918280202398875758",
                },
            });
        }

        buttons.push({
            type: 2,
            label: "Check out Premium",
            style: 5,
            url: `${WEB_BASE_URL}/premium`,
        });

        await ctx.reply(
            {
                embeds: [embed],
                components: [
                    {
                        type: 1,
                        components: buttons,
                    },
                ],
            },
            {
                ephemeral: true,
            }
        );

        return false;
    }

    /**
     * Sends a follow-up message to a Discord interaction. Meant to send ads and other messages that are not directly related to the command.
     * @param {string} application_id - The ID of the Discord application.
     * @param {string} token - The token of the interaction.
     * @param {any} data - The data to be sent as the follow-up message.
     * @returns {Promise<void>} - A promise that resolves when the follow-up message is sent successfully.
     */
    async postFollowup({
        application_id,
        token,
        data,
    }: {
        application_id: string;
        token: string;
        data: any;
    }) {
        await fetch(`${this.discordAPIUrl}/webhooks/${application_id}/${token}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
    }

    /**
     * Edits the original message of a webhook.
     * @param {Object} options - The options for editing the origin.
     * @param {string} options.application_id - The application ID.
     * @param {string} options.token - The webhook token.
     * @param {any} options.data - The data to be sent in the request body.
     * @returns {Promise<void>} - A promise that resolves when the request is complete.
     */
    async editOrigin({
        application_id,
        token,
        data,
    }: {
        application_id: string;
        token: string;
        data: any;
    }) {
        const thing = await fetch(
            `${this.discordAPIUrl}/webhooks/${application_id}/${token}/messages/@original`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }
        );
    }

    async deleteMessage({ channel_id, message_id }: { channel_id: string; message_id: string }) {
        console.log(`${this.discordAPIUrl}/channels/${channel_id}/messages/${message_id}`)
        const response = await fetch(`${this.discordAPIUrl}/channels/${channel_id}/messages/${message_id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${this.token}`,
            },
        });

        if (!response.ok) {
            console.error(`Failed to delete message ${message_id} in channel ${channel_id}`);
            console.error(await response.text());
        }


    }
}
