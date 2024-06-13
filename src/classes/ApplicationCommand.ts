import { APIApplicationCommandOption, ApplicationCommandType, Snowflake } from "discord-api-types/v10";
import { AutocompleteCallback } from "../types/discord";
import { AutocompleteContext, SlashCommandContext } from "./CommandContext";
import Extension from "./Extension";
import { Permission } from "./Functions";
import { ReadOnly } from "./OptionTypes";

export class InteractionCommand {
    id?: Snowflake;
    extension?: Extension;
    name: string;
    scopes: Snowflake[];
    defaultMemberPermissions: Permission[] | null;
    dmPermission: boolean;
    description: string = "No description set";
    nsfw: boolean;
    callback?: (ctx: any) => Promise<void>;
    type: ApplicationCommandType = ApplicationCommandType.ChatInput;
    integration_types?: number[];
    contexts?: number[];

    constructor(
        name: string,
        defaultMemberPermissions: Permission[] | null,
        dmPermission: boolean = false,
        nsfw?: boolean,
        description?: string,
        scopes?: Snowflake[],
        extension?: Extension,
        callback?: (ctx: any) => Promise<void>,
        integration_types?: number[],
        contexts?: number[]
    ) {
        this.name = name;
        this.scopes = scopes || [];
        this.defaultMemberPermissions = defaultMemberPermissions || null;
        this.dmPermission = dmPermission;
        this.nsfw = nsfw || false;
        this.description = description || this.description;
        this.extension = extension;
        this.callback = callback;
        this.integration_types = integration_types || [];
        this.contexts = contexts || [];
    }

    mention(subcommand?: string) {
        return `</${this.name}${subcommand ? ` ${subcommand}` : ""}:${this.id}>`;
    }
}

export class SlashCommand extends InteractionCommand {
    description: string; // default: "No description set"
    groupName?: string;
    groupDescription?: string;
    subCmdName?: string;
    subCmdDescription?: string;
    options: ReadOnly<APIApplicationCommandOption[]> | null;
    autocompleteCallbacks: AutocompleteCallback[];
    type: ApplicationCommandType = ApplicationCommandType.ChatInput;

    constructor(
        name: string,
        description: string,
        options: APIApplicationCommandOption[] | null,
        defaultMemberPermissions: Permission[] | null,
        dmPermission: boolean,
        nsfw: boolean,
        scopes?: Snowflake[],
        extension?: Extension,
        callback?: (ctx: SlashCommandContext) => Promise<void>,
        autocompleteCallbacks?: AutocompleteCallback[] | null,
        integration_types?: number[],
        contexts?: number[]
    ) {
        super(
            name,
            defaultMemberPermissions,
            dmPermission,
            nsfw,
            description,
            scopes,
            extension,
            callback,
            integration_types,
            contexts
        );
        this.description = description;
        this.options = options || null;
        this.autocompleteCallbacks = autocompleteCallbacks || [];
    }

    // Working example:
    // {
    //     "id": "1161470692232011897",
    //     "name": "sample_autocomplete",
    //     "options": [
    //       {
    //         "focused": true,
    //         "name": "input",
    //         "type": 3,
    //         "value": "f"
    //       }
    //     ],
    //     "type": 1
    //   }

    // Broken example:
    //   {
    //     "id": "1161478281766379540",
    //     "name": "mention",
    //     "options": [
    //       {
    //         "name": "link",
    //         "options": [
    //           {
    //             "focused": true,
    //             "name": "text",
    //             "type": 3,
    //             "value": "dwdw"
    //           }
    //         ],
    //         "type": 1
    //       }
    //     ],
    //     "type": 1
    //   }

    // create a function that will be called when autocomplete is called, it will take the option name and the callback, this is a void function
    async autocomplete(ctx: AutocompleteContext): Promise<void> {
        const findFocusedOption = (options: any): any | null => {
            for (const option of options) {
                if (option.focused) {
                    return option;
                }
                if (option.options) {
                    const focused = findFocusedOption(option.options);
                    if (focused) {
                        return focused;
                    }
                }
            }
            return null;
        };

        const focusedOption = findFocusedOption(ctx.data?.options || []);
        if (!focusedOption) {
            console.error("No focused option found");
            return;
        }

        const name = focusedOption.name;

        const callback = this.autocompleteCallbacks.find(
            (callback) => callback.option_name === name
        );
        if (!callback) {
            console.error(`Autocomplete callback for ${name} not found`);
            return;
        }

        await callback.callback(ctx, focusedOption);
    }
}

// NOTE: This is hard typed to the message type since it's our only use case for now
export class ContextMenuCommand extends InteractionCommand {
    type: ApplicationCommandType = ApplicationCommandType.Message;

    constructor(
        name: string,
        defaultMemberPermissions: Permission[] | null,
        dmPermission: boolean,
        nsfw: boolean,
        description: string,
        scopes?: Snowflake[],
        extension?: Extension,
        callback?: (ctx: any) => Promise<void>
    ) {
        super(
            name,
            defaultMemberPermissions,
            dmPermission,
            nsfw,
            description,
            scopes,
            extension,
            callback
        );
    }
}
