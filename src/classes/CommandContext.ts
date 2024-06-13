import {
    APIApplicationCommandAutocompleteInteraction,
    APIApplicationCommandInteraction,
    APIApplicationCommandInteractionDataOption,
    APIApplicationCommandInteractionDataSubcommandGroupOption,
    APIApplicationCommandInteractionDataSubcommandOption,
    APIApplicationCommandOption,
    APIApplicationCommandOptionChoice,
    APIAuthorizingIntegrationOwnersMap,
    APIBaseInteraction,
    APIChannel,
    APIChatInputApplicationCommandInteraction,
    APIChatInputApplicationCommandInteractionData,
    APIContextMenuInteraction,
    APIEntitlement,
    APIInteractionDataResolved,
    APIInteractionGuildMember,
    APIInteractionResponseCallbackData,
    APIMessageApplicationCommandInteraction,
    APIMessageApplicationCommandInteractionData,
    APIMessageApplicationCommandInteractionDataResolved,
    APIModalInteractionResponseCallbackData,
    APIUser,
    ApplicationCommandOptionType,
    InteractionResponseType,
    InteractionType,
    MessageFlags,
    RESTPatchAPIInteractionFollowupJSONBody,
    Snowflake,
} from "discord-api-types/v10";
import type { FastifyReply } from "fastify";

import { InteractionCommand } from "./ApplicationCommand";
import type Client from "./Client";
import type { OptionType } from "./OptionTypes";

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
    context?: number
}

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
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;
    entitlements: APIEntitlement[];
    defered: boolean;
    context?: number
    authorizing_integration_owners: APIAuthorizingIntegrationOwnersMap;
    app_permissions: string;

    constructor(
        // interaction: APIChatInputApplicationCommandInteractionWithEntitlements,
        interaction: APIChatInputApplicationCommandInteraction,
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
        this.channelId = interaction.channel.id;
        this.guildId = interaction.guild_id;

        this.member = interaction.member;
        this.user = interaction.user || interaction.member!.user;

        this.channel = interaction.channel;

        this.entitlements = interaction.entitlements;
        this.defered = false;
        this.authorizing_integration_owners = interaction.authorizing_integration_owners;
        this.context = interaction.context
        this.app_permissions = interaction.app_permissions;
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

    async reply(
        data: string | APIInteractionResponseCallbackData,
        options?: { ephemeral?: boolean }
    ) {
        if (this.defered) {
            // If deferred, create a new follow-up message
            if (typeof data === "string") data = { content: data };
            if (options?.ephemeral) {
                data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
            }
            return this.client.postFollowup({
                application_id: this.applicationId,
                token: this.token,
                data,
            });
        } else {
            // If not deferred, reply as usual
            if (typeof data === "string") data = { content: data };
            if (options?.ephemeral) {
                data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
            }
            return this.response.send({
                type: InteractionResponseType.ChannelMessageWithSource,
                data,
            });
        }
    }

    defer(options?: { ephemeral?: boolean }) {
        let data: APIInteractionResponseCallbackData = {};
        if (options?.ephemeral) {
            data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
        }
        this.response.send({
            type: InteractionResponseType.DeferredChannelMessageWithSource,
            data,
        });

        this.defered = true;
    }

    replyModal(data: APIModalInteractionResponseCallbackData) {
        this.response.send({
            type: InteractionResponseType.Modal,
            data,
        });
    }

    friendlyError(message: string, error_code: string) {
        return this.reply(
            `${message}\nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            { ephemeral: true }
        );
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
    entitlements: APIEntitlement[];
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;
    authorID: Snowflake;
    id: Snowflake;
    application_id: Snowflake;
    type: InteractionType.ApplicationCommand;
    version;
    locale;
    context?: number
    authorizing_integration_owners: APIAuthorizingIntegrationOwnersMap;
    app_permissions: string;

    constructor(
        // interaction: APIChatInputApplicationCommandInteractionWithEntitlements,
        interaction: APIMessageApplicationCommandInteraction,
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

        this.context = interaction.context
        this.authorizing_integration_owners = interaction.authorizing_integration_owners;
        this.app_permissions = interaction.app_permissions;
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

    friendlyError(message: string, error_code: string) {
        return this.reply(
            `${message}\nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            { ephemeral: true }
        );
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
    data; // I do not know how to type this, but it inherits from APIApplicationCommandAutocompleteInteraction
    token: string;
    response: FastifyReply;
    client: Client;
    command: InteractionCommand;
    applicationId: Snowflake;
    channelId?: Snowflake;
    guildId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    entitlements: APIEntitlement[];
    appPermissions?: string;
    channel?: Partial<APIChannel> & Pick<APIChannel, "id" | "type">;
    authorID: Snowflake;
    id: Snowflake;
    application_id: Snowflake;
    type: number;
    version;
    locale;
    authorizing_integration_owners: APIAuthorizingIntegrationOwnersMap;
    app_permissions: string;

    constructor(
        interaction: APIApplicationCommandAutocompleteInteraction,
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

        this.authorizing_integration_owners = interaction.authorizing_integration_owners;
        this.app_permissions = interaction.app_permissions;
    }

    reply({ choices }: { choices?: APIApplicationCommandOptionChoice[] }) {
        return this.response.send({
            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
            data: {
                choices,
            },
        });
    }
}
