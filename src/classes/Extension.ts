import { APIApplicationCommandOption, Snowflake } from "discord-api-types/v10";
import { Permission } from "./Functions";
import { ReadOnly } from "./OptionTypes";
import { SlashCommandContext } from "./CommandContext";
import { SlashCommand } from "./ApplicationCommand";
import { AutocompleteCallback } from "../types/discord";

export default class Extension {
    name: string;
    commands: Map<string, SlashCommand>;

    constructor(name: string) {
        this.name = name;

        let commands = new Map<string, SlashCommand>();

        const proto = Object.getPrototypeOf(this);
        for (const propertyName in proto) {
            if (proto.hasOwnProperty(propertyName)) {
                commands = new Map([...commands, ...proto.commands]);
            }
        }

        this.commands = commands;

        // for command in commands, add the extension to the command
        for (const [name, command] of this.commands) {
            command.extension = this;
        }
    }
}

export function slash_command({
    name,
    description,
    options = null,
    defaultMemberPermissions = null,
    dmPermission = false,
    nsfw = false,
    scopes = [],
    autocompleteCallbacks = null,
    extension,
}: {
    name: string;
    description: string;
    options?: APIApplicationCommandOption[] | null;
    defaultMemberPermissions?: Permission[] | null;
    dmPermission?: boolean;
    nsfw?: boolean;
    scopes?: Snowflake[];
    autocompleteCallbacks?: AutocompleteCallback[] | null;
    extension?: Extension;
}): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const command = new SlashCommand(
            name,
            description,
            options,
            defaultMemberPermissions,
            dmPermission,
            nsfw,
            scopes,
            extension,
            descriptor.value,
            autocompleteCallbacks
        );
        if (!target.commands) {
            target.commands = new Map();
        }
        descriptor.value = async function (ctx: SlashCommandContext) {
            // Add your logic here...
            console.log(ctx);
        };
        target.commands.set(name, command);

        return descriptor;
    };
}
