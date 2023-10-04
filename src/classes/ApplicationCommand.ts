import {
    APIApplicationCommandInteractionDataBasicOption,
    APIApplicationCommandOption,
    ApplicationCommandType,
    Snowflake,
} from "discord-api-types/v10";
import { Permission } from "./Functions";
import { ReadOnly } from "./OptionTypes";
import { AutocompleteContext } from "./CommandContext";

export default interface InteractionCommand {
    type: ApplicationCommandType;
    name: string;
    scopes: Snowflake[];
    defaultMemberPermissions: Permission[];
    dmPermission: boolean;
    nsfw: boolean;
    run: (ctx: any) => Promise<void>;
}

export interface ContextMenu extends InteractionCommand {}

export interface SlashCommand extends InteractionCommand {
    description: string; // default: "No description set"
    options: ReadOnly<APIApplicationCommandOption[]>;
    autocompleteCallback?: (data: AutocompleteContext) => Promise<void>;
}
