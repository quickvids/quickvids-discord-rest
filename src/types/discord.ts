import {
    Snowflake,
    APIApplicationCommandInteractionDataStringOption,
    APIBaseInteraction,
    APIChatInputApplicationCommandInteractionData,
    InteractionType,
    ApplicationCommandType,
} from "discord-api-types/v10";

// APIApplicationCommandInteractionDataStringOption
export interface AutocompleteData {
    id: Snowflake;
    name: string; // name of the command
    options: APIApplicationCommandInteractionDataStringOption[];
    type: ApplicationCommandType;
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
