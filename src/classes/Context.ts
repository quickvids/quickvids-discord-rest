import type {
    APIInteractionDataResolved,
    APIInteractionResponseCallbackData,
    APIApplicationCommandOption,
    APIInteractionGuildMember,
    APIUser,
    RESTPatchAPIInteractionFollowupJSONBody,
} from "discord-api-types/v10";

import { OptionType } from "./OptionTypes";
import type Client from "./Client";
import { APIApplicationEntitlement } from "../types/premium";

export default interface Context {
    client: Client;
    args: (string | number | boolean)[];
    resolved?: APIInteractionDataResolved;
    channelId: string;
    guildId?: string;
    member?: APIInteractionGuildMember;
    user: APIUser;
    appPermissions?: string;
    entitlements?: APIApplicationEntitlement[];

    getOption<O extends APIApplicationCommandOption>(
        name: string
    ): OptionType<O> | undefined;
    reply(
        data: string | APIInteractionResponseCallbackData,
        options?: { ephemeral?: boolean }
    ): void;
    editResponse(
        data: string | RESTPatchAPIInteractionFollowupJSONBody,
        messageId?: string
    ): void;
}
