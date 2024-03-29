import type {
    APIApplicationCommandInteractionDataBasicOption,
    APIApplicationCommandInteractionDataSubcommandOption,
    APIApplicationCommandOption,
    APIApplicationCommandSubcommandGroupOption,
    APIApplicationCommandSubcommandOption,
    ApplicationCommandOptionType,
    Snowflake,
} from "discord-api-types/v10";

export type Mutable<D> = {
    -readonly [key in keyof D]: Mutable<D[key]>;
};
export type ReadOnly<D> = {
    readonly [key in keyof D]: ReadOnly<D[key]>;
};

export type OptionType<O extends APIApplicationCommandOption> =
    O extends APIApplicationCommandSubcommandOption
        ? SubOptionType<O>
        : O extends Exclude<
              APIApplicationCommandOption,
              | APIApplicationCommandSubcommandOption
              | APIApplicationCommandSubcommandGroupOption
          >
        ? DataOption<O>
        : never;

type SubOptionType<O extends APIApplicationCommandSubcommandOption> = {
    name: O["name"];
    type: O["type"];
    options: O["options"] extends any[]
        ? O["type"] extends ApplicationCommandOptionType.SubcommandGroup
            ? APIApplicationCommandInteractionDataSubcommandOption[]
            : APIApplicationCommandInteractionDataBasicOption[]
        : [];
};

type DataOption<
    O extends Exclude<
        APIApplicationCommandOption,
        | APIApplicationCommandSubcommandOption
        | APIApplicationCommandSubcommandGroupOption
    >
> = {
    name: O["name"];
    type: O["type"];
    value: O extends { choices: { value: any }[] }
        ? O["choices"][number]["value"]
        : ValueType<O>;
};

type MentionableTypes =
    | ApplicationCommandOptionType.User
    | ApplicationCommandOptionType.Channel
    | ApplicationCommandOptionType.Role
    | ApplicationCommandOptionType.Mentionable;
type NumberTypes =
    | ApplicationCommandOptionType.Number
    | ApplicationCommandOptionType.Integer;

type ValueType<
    O extends Exclude<
        APIApplicationCommandOption,
        | APIApplicationCommandSubcommandOption
        | APIApplicationCommandSubcommandGroupOption
    >
> = O["type"] extends ApplicationCommandOptionType.Boolean
    ? boolean
    : O["type"] extends NumberTypes
    ? number
    : O["type"] extends ApplicationCommandOptionType.String
    ? string
    : O["type"] extends MentionableTypes
    ? Snowflake
    : O["type"] extends ApplicationCommandOptionType.Attachment
    ? Snowflake
    : never;
