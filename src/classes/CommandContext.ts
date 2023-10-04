import {
    APIApplicationCommandInteractionDataSubcommandGroupOption,
    APIInteractionDataResolved,
    APIApplicationCommandInteractionDataSubcommandOption,
    APIChatInputApplicationCommandInteractionData,
    APIApplicationCommandInteractionDataOption,
    APIInteractionResponseCallbackData,
    APIApplicationCommandInteraction,
    ApplicationCommandOptionType,
    APIApplicationCommandOption,
    APIInteractionGuildMember,
    InteractionResponseType,
    APIUser,
    APIModalInteractionResponseCallbackData,
    MessageFlags,
    RESTPatchAPIInteractionFollowupJSONBody,
    APIChannel,
    APIMessageApplicationCommandInteractionData,
    APIContextMenuInteraction,
    APIMessageApplicationCommandInteractionDataResolved,
    Snowflake,
    InteractionType,
    APIApplicationCommandOptionChoice,
} from "discord-api-types/v10";
import type { FastifyReply } from "fastify";

import {
    APIApplicationCommandAutocompleteInteractionWithEntitlements,
    APIApplicationEntitlement,
    APIChatInputApplicationCommandInteractionWithEntitlements,
    APIContextMenuInteractionWithEntitlements,
} from "../types/premium";
import type { OptionType } from "./OptionTypes";
import type InteractionContext from "./Context";
import type Client from "./Client";
import InteractionCommand from "./ApplicationCommand";
import { APIApplicationCommandAutocompleteInteraction, AutocompleteData } from "../types/discord";

export class SlashCommandContext implements InteractionContext {
    rawInteraction: APIApplicationCommandInteraction;
    rawData: APIChatInputApplicationCommandInteractionData;
    token: string;
    response: FastifyReply;
    client: Client;
    command: InteractionCommand;
    options: APIApplicationCommandInteractionDataOption[];
    args: (string | number | boolean)[];
    resolved?: APIInteractionDataResolved;
    applicationId: string;
    channelId: Snowflake;
    guildId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    authorID: Snowflake;
    id: Snowflake;
    application_id: Snowflake;
    type: InteractionType.ApplicationCommand;
    version;
    locale;
    entitlements?: APIApplicationEntitlement[];
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;

    constructor(
        interaction: APIChatInputApplicationCommandInteractionWithEntitlements,
        client: Client,
        response: FastifyReply
    ) {
        this.rawInteraction = interaction;
        this.rawData = interaction.data;
        this.token = interaction.token;
        this.response = response;
        this.client = client;

        this.id = interaction.id;
        this.authorID = interaction.member?.user?.id || interaction.user!.id;
        this.application_id = interaction.application_id;
        this.type = interaction.type;
        this.version = interaction.version;
        this.locale = interaction.locale;

        this.command = this.client.getCommand(interaction.data.name)!;
        this.options = interaction.data.options || [];

        this.args = this.options.map((o) =>
            o.type === ApplicationCommandOptionType.Subcommand ||
            o.type === ApplicationCommandOptionType.SubcommandGroup
                ? o.name
                : o.value
        );
        this.resolved = interaction.data.resolved;
        this.appPermissions = interaction.app_permissions;

        this.applicationId = interaction.application_id;
        this.channelId = interaction.channel_id;
        this.guildId = interaction.guild_id;

        this.member = interaction.member;
        this.user = interaction.user || interaction.member!.user;

        this.channel = interaction.channel;

        this.entitlements = interaction.entitlements;
    }

    getOption<O extends APIApplicationCommandOption>(name: string): OptionType<O> | undefined {
        const mainResult = this.options.find((o) => o.name === name);
        if (mainResult) return mainResult as OptionType<O>;
        if (
            ![
                ApplicationCommandOptionType.Subcommand,
                ApplicationCommandOptionType.SubcommandGroup,
            ].includes(this.options[0]?.type)
        )
            return;
        const firstRes = (
            (
                this.options[0] as
                    | APIApplicationCommandInteractionDataSubcommandGroupOption
                    | APIApplicationCommandInteractionDataSubcommandOption
            ).options as (
                | APIApplicationCommandInteractionDataSubcommandGroupOption
                | APIApplicationCommandInteractionDataSubcommandOption
            )[]
        )?.find((o) => o.name === name);
        if (firstRes) return firstRes as OptionType<O>;
        if (
            (
                this.options[0] as
                    | APIApplicationCommandInteractionDataSubcommandGroupOption
                    | APIApplicationCommandInteractionDataSubcommandOption
            ).options?.[0]?.type !== ApplicationCommandOptionType.Subcommand
        )
            return;
        const secondRes = (
            (this.options[0] as APIApplicationCommandInteractionDataSubcommandGroupOption)
                .options[0] as APIApplicationCommandInteractionDataSubcommandOption
        ).options?.find((o) => o.name === name);
        if (secondRes) return secondRes as OptionType<O>;
        return;
    }

    reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }) {
        if (typeof data === "string") data = { content: data };
        if (options?.ephemeral) {
            data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
        }
        this.response.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data,
        });
    }

    replyModal(data: APIModalInteractionResponseCallbackData) {
        this.response.send({
            type: InteractionResponseType.Modal,
            data,
        });
    }

    editResponse(data: string | RESTPatchAPIInteractionFollowupJSONBody, messageId = "@original") {
        if (typeof data === "string") data = { content: data };
        return this.client.functions.editInteractionResponse(
            data,
            this.client.id,
            this.token,
            messageId
        );
    }
}

export class ContextMenuContext implements InteractionContext {
    rawInteraction: APIContextMenuInteraction;
    rawData: APIMessageApplicationCommandInteractionData;
    token: string;
    response: FastifyReply;
    client: Client;
    command: InteractionCommand;
    resolved?: APIMessageApplicationCommandInteractionDataResolved;
    applicationId: Snowflake;
    channelId: Snowflake;
    guildId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    entitlements?: APIApplicationEntitlement[];
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;
    authorID: Snowflake;
    id: Snowflake;
    application_id: Snowflake;
    type: InteractionType.ApplicationCommand;
    version;
    locale;

    constructor(
        // interaction: APIChatInputApplicationCommandInteractionWithEntitlements,
        interaction: APIContextMenuInteractionWithEntitlements,
        client: Client,
        response: FastifyReply
    ) {
        this.rawInteraction = interaction;
        this.rawData = interaction.data;
        this.token = interaction.token;
        this.response = response;
        this.client = client;

        this.id = interaction.id;
        this.authorID = interaction.member?.user?.id || interaction.user!.id;
        this.application_id = interaction.application_id;
        this.type = interaction.type;
        this.version = interaction.version;
        this.locale = interaction.locale;

        this.command = this.client.getCommand(interaction.data.name)!;

        this.resolved = interaction.data.resolved;
        this.appPermissions = interaction.app_permissions;

        this.applicationId = interaction.application_id;
        this.channelId = interaction.channel_id;
        this.guildId = interaction.guild_id;

        this.member = interaction.member;
        this.user = interaction.user || interaction.member!.user;

        this.channel = interaction.channel;

        this.entitlements = interaction.entitlements;
    }

    reply(data: string | APIInteractionResponseCallbackData, options?: { ephemeral?: boolean }) {
        if (typeof data === "string") data = { content: data };
        if (options?.ephemeral) {
            data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
        }
        this.response.send({
            type: InteractionResponseType.ChannelMessageWithSource,
            data,
        });
    }

    replyModal(data: APIModalInteractionResponseCallbackData) {
        this.response.send({
            type: InteractionResponseType.Modal,
            data,
        });
    }

    editResponse(data: string | RESTPatchAPIInteractionFollowupJSONBody, messageId = "@original") {
        if (typeof data === "string") data = { content: data };
        return this.client.functions.editInteractionResponse(
            data,
            this.client.id,
            this.token,
            messageId
        );
    }
}

export class AutocompleteContext implements APIApplicationCommandAutocompleteInteraction {
    rawInteraction: APIApplicationCommandAutocompleteInteraction;
    data: AutocompleteData;
    token: string;
    response: FastifyReply;
    client: Client;
    command: InteractionCommand;
    applicationId: Snowflake;
    channelId?: Snowflake;
    guildId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    entitlements?: APIApplicationEntitlement[];
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;
    authorID: Snowflake;
    id: Snowflake;
    application_id: Snowflake;
    type: number;
    version;
    locale;

    constructor(
        interaction: APIApplicationCommandAutocompleteInteractionWithEntitlements,
        client: Client,
        response: FastifyReply
    ) {
        this.rawInteraction = interaction;
        this.data = interaction.data;
        this.token = interaction.token;
        this.response = response;
        this.client = client;

        this.id = interaction.id;
        this.authorID = interaction.member?.user?.id || interaction.user!.id;
        this.application_id = interaction.application_id;
        this.type = interaction.type;
        this.version = interaction.version;
        this.locale = interaction.locale;

        this.command = this.client.getCommand(interaction.data.name)!;

        this.applicationId = interaction.application_id;
        this.channelId = interaction.channel?.id;
        this.guildId = interaction.guild_id;

        this.member = interaction.member;
        this.user = interaction.user || interaction.member!.user;

        this.channel = interaction.channel;

        this.entitlements = interaction.entitlements;
    }

    respond(choices: APIApplicationCommandOptionChoice[]) {
        return this.response.send({
            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
            data: {
                choices,
            },
        });
    }
}
