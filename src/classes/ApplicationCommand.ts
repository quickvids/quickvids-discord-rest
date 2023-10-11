import {
    APIApplicationCommandInteractionDataStringOption,
    APIApplicationCommandOption,
    APIApplicationCommandOptionBase,
    APIInteractionDataOptionBase,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Snowflake,
} from "discord-api-types/v10";
import { Permission } from "./Functions";
import { ReadOnly } from "./OptionTypes";
import { AutocompleteContext, SlashCommandContext } from "./CommandContext";
import Extension from "./Extension";
import { AutocompleteCallback } from "../types/discord";

export class InteractionCommand {
    extension?: Extension;
    name: string;
    scopes: Snowflake[];
    defaultMemberPermissions: Permission[] | null;
    dmPermission: boolean;
    nsfw: boolean;
    callback?: (ctx: any) => Promise<void>;
    type: ApplicationCommandType = ApplicationCommandType.ChatInput;

    constructor(
        name: string,
        defaultMemberPermissions: Permission[] | null,
        dmPermission: boolean = false,
        nsfw: boolean,
        scopes?: Snowflake[],
        extension?: Extension,
        callback?: (ctx: any) => Promise<void>
    ) {
        this.name = name;
        this.scopes = scopes || [];
        this.defaultMemberPermissions = defaultMemberPermissions || null;
        this.dmPermission = dmPermission;
        this.nsfw = nsfw;
        this.extension = extension;
        this.callback = callback;
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
        autocompleteCallbacks?: AutocompleteCallback[] | null
    ) {
        super(name, defaultMemberPermissions, dmPermission, nsfw, scopes, extension, callback);
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
