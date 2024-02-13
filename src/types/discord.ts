import {
    Snowflake,
    APIApplicationCommandInteractionDataStringOption,
    APIBaseInteraction,
    APIChatInputApplicationCommandInteractionData,
    InteractionType,
    ApplicationCommandType,
    APIApplicationCommandOptionBase,
    APIInteractionDataOptionBase,
    ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { AutocompleteContext } from "../classes/CommandContext";

// APIApplicationCommandInteractionDataStringOption
export interface AutocompleteData {
    id: Snowflake;
    name: string; // name of the command
    options: APIApplicationCommandInteractionDataStringOption[];
    type: ApplicationCommandType;
}

export interface AutocompleteCallback {
    option_name: string;
    callback: (ctx: AutocompleteContext, focusedOption?: any) => Promise<void>;
}

export type APIApplicationCommandAutocompleteInteraction = APIBaseInteraction<
    InteractionType.ApplicationCommandAutocomplete,
    AutocompleteData
> &
    Required<
        Pick<
            APIBaseInteraction<
                InteractionType.ApplicationCommandAutocomplete,
                Required<Pick<APIChatInputApplicationCommandInteractionData, "options">>
            >,
            "data"
        >
    >;

export enum EmbedMethod {
    Unknown = 0,
    SlashCommand = 1,
    Gateway = 2,
    AppContextMenu = 3,
}
