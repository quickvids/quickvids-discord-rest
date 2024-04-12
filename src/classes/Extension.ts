import { APIApplicationCommandOption, Snowflake } from "discord-api-types/v10";
import { AutocompleteCallback } from "../types/discord";
import { ContextMenuCommand, SlashCommand } from "./ApplicationCommand";
import { SlashCommandContext } from "./CommandContext";
import { ComponentCallback } from "./ComponentContext";
import { Permission } from "./Functions";

export default class Extension {
    name: string;
    commands: Map<string, SlashCommand | ContextMenuCommand>;
    components: Map<string, ComponentCallback>;

    constructor(name: string) {
        this.name = name;

        let commands = new Map<string, SlashCommand | ContextMenuCommand>();
        let components = new Map<string, ComponentCallback>();

        const proto = Object.getPrototypeOf(this);
        for (const propertyName in proto) {
            if (proto.hasOwnProperty(propertyName)) {
                if (propertyName === "commands") {
                    commands = new Map([...commands, ...proto.commands]);
                } else if (propertyName === "components") {
                    components = new Map([...components, ...proto.components]);
                }
            }
        }

        this.commands = commands;
        this.components = components;
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
    integration_types?: number[];
    contexts?: number[]
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

// name: string,
// defaultMemberPermissions: Permission[] | null,
// dmPermission: boolean,
// nsfw: boolean,
// scopes?: Snowflake[],
// extension?: Extension,
// callback?: (ctx: any) => Promise<void>

// type can be 2 for USER, 3 for MESSAGE

export function context_menu({
    name,
    defaultMemberPermissions = null,
    dmPermission = false,
    nsfw = false,
    description = "No description set",
    scopes = [],
    extension,
}: {
    name: string;
    defaultMemberPermissions?: Permission[] | null;
    dmPermission?: boolean;
    nsfw?: boolean;
    description?: string;
    scopes?: Snowflake[];
    extension?: Extension;
}): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const command = new ContextMenuCommand(
            name,
            defaultMemberPermissions,
            dmPermission,
            nsfw,
            description,
            scopes,
            extension,
            descriptor.value
        );

        if (!target.commands) {
            target.commands = new Map();
        }

        target.commands.set(name, command);

        return descriptor;
    };
}

// this will get called when a user interacts with a persistent component (button, select menu)
export function persistent_component({
    custom_id,
    extension,
}: {
    custom_id: RegExp;
    extension?: Extension;
    callback?: (ctx: any) => Promise<void>;
}): Function {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const component = new ComponentCallback(custom_id, extension, descriptor.value);
        if (!target.components) {
            target.components = new Map();
        }
        target.components.set(custom_id, component);

        return descriptor;
    };
}
