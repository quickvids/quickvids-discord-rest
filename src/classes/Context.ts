import type {
    APIInteractionGuildMember,
    APIUser,
    APIBaseInteraction,
    InteractionType,
    Snowflake,
} from "discord-api-types/v10";

import type Client from "./Client";
import { APIApplicationEntitlement } from "../types/premium";
import InteractionCommand from "./ApplicationCommand";

export default interface InteractionContext
    extends APIBaseInteraction<InteractionType.ApplicationCommand, any> {
    client: Client;
    command: InteractionCommand;
    authorID: Snowflake;
    guildId?: Snowflake;
    channelId: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    appPermissions?: string;
    entitlements?: APIApplicationEntitlement[];
}
