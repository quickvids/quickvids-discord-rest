import type { APIApplicationCommandOption, ApplicationCommandType } from "discord-api-types/v10";

import type { ReadOnly } from "./OptionTypes";
import type { Permission } from "./Functions";
import { ContextMenuContext, SlashCommandContext } from "./CommandContext";

export enum ApplicationCommandContext {
    Guild = 0, // Allow command in guilds
    BotDM = 1, // Allow command in user-bot DMs
    PrivateChannel = 2, // Allow command in user-user or group DMs
}

export default interface InteractionCommand {
    type: ApplicationCommandType;
    name: string;
    description?: string;
    options?: ReadOnly<APIApplicationCommandOption[]>;
    perms: Permission[];
    contexts?: ApplicationCommandContext[];
    guildId?: string[];
    default_member_permissions?: string | null;
    run: (ctx: SlashCommandContext | ContextMenuContext) => Promise<void>;
}
