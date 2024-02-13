import {
    APIBaseInteraction,
    APIEntitlement,
    APIInteractionGuildMember,
    APIInteractionResponseCallbackData,
    APIMessageComponentInteraction,
    APIModalInteractionResponseCallbackData,
    APIModalSubmitInteraction,
    APIUser,
    InteractionResponseType,
    InteractionType,
    MessageFlags,
    Snowflake,
} from "discord-api-types/v10";
import { FastifyReply } from "fastify";
import Client from "./Client";
import Extension from "./Extension";

export class ComponentCallback {
    custom_id: RegExp;
    extension?: Extension;
    callback?: (ctx: any) => Promise<void>;

    constructor(custom_id: RegExp, extension?: Extension, callback?: (ctx: any) => Promise<void>) {
        this.custom_id = custom_id;
        this.extension = extension;
        this.callback = callback;
    }
}

export default interface ComponentContext
    extends APIBaseInteraction<
        InteractionType.MessageComponent | InteractionType.ModalSubmit,
        any
    > {
    client: Client;
    component: ComponentCallback;
    authorID: Snowflake;
    guildId?: Snowflake;
    channelId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    appPermissions?: string;
    entitlements: APIEntitlement[];
}

export class ButtonContext implements ComponentContext {
    client: Client;
    component: ComponentCallback;
    response: FastifyReply;

    authorID: Snowflake;
    guildId?: Snowflake;
    channelId: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    id: Snowflake;
    appPermissions?: string;
    entitlements: APIEntitlement[];
    data: APIMessageComponentInteraction;
    custom_id: string;
    token: string;
    application_id: string;
    locale;
    defered: boolean;
    type: InteractionType.MessageComponent;
    version;

    callback?: (ctx: any) => Promise<void>;

    constructor(
        interaction: APIMessageComponentInteraction,
        client: Client,
        response: FastifyReply
    ) {
        this.data = interaction;
        this.client = client;
        this.response = response;
        this.component = this.client.getComponentCallback(interaction.data.custom_id)!;
        this.token = interaction.token;
        this.user = interaction.user || interaction.member!.user;
        this.appPermissions = interaction.member?.permissions;
        this.id = interaction.id;
        this.authorID = this.user.id;
        this.guildId = interaction.guild_id;
        this.channelId = interaction.channel.id;
        this.member = interaction.member;
        this.entitlements = interaction.entitlements;
        this.custom_id = interaction.data.custom_id;
        this.application_id = interaction.application_id;
        this.type = interaction.type;
        this.version = interaction.version;
        this.locale = interaction.locale;
        this.defered = false;
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
                application_id: this.application_id,
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

    //     Edit Original Interaction Response
    // PATCH/webhooks/{application.id}/{interaction.token}/messages/@original
    // Edits the initial Interaction response. Functions the same as Edit Webhook Message.

    async editOrigin(data: APIInteractionResponseCallbackData) {
        return this.client.editOrigin({
            application_id: this.application_id,
            token: this.token,
            data,
        });
    }

    defer(options?: { ephemeral?: boolean; edit_origin?: boolean }) {
        let data: APIInteractionResponseCallbackData = {};
        if (options?.ephemeral) {
            data.flags = (data.flags || 0) | MessageFlags.Ephemeral;
        }
        let type = InteractionResponseType.DeferredChannelMessageWithSource;
        if (options?.edit_origin) {
            type = InteractionResponseType.DeferredMessageUpdate;
        }
        this.response.send({
            type: type,
            data,
        });

        this.defered = true;
    }

    friendlyError(message: string, error_code: string) {
        return this.reply(
            `${message}\nIf you believe this is an error, join the support server for more help. [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            { ephemeral: true }
        );
    }

    replyModal(data: APIModalInteractionResponseCallbackData) {
        this.response.send({
            type: InteractionResponseType.Modal,
            data,
        });
    }
}
export class ModalContext implements ComponentContext {
    client: Client;
    component: ComponentCallback;
    response: FastifyReply;

    authorID: Snowflake;
    guildId?: Snowflake;
    channelId?: Snowflake;
    member?: APIInteractionGuildMember;
    user: APIUser;
    id: Snowflake;
    appPermissions?: string;
    entitlements: APIEntitlement[];
    data: APIModalSubmitInteraction;
    custom_id: string;
    token: string;
    application_id: string;
    locale;
    type: InteractionType.ModalSubmit;
    version;

    callback?: (ctx: any) => Promise<void>;

    constructor(interaction: APIModalSubmitInteraction, client: Client, response: FastifyReply) {
        this.data = interaction;
        this.client = client;
        this.response = response;
        this.component = this.client.getComponentCallback(interaction.data.custom_id)!;
        this.token = interaction.token;
        this.user = interaction.user || interaction.member!.user;
        this.appPermissions = interaction.member?.permissions;
        this.id = interaction.id;
        this.authorID = this.user.id;
        this.guildId = interaction.guild_id;
        this.channelId = interaction.channel?.id;
        this.member = interaction.member;
        this.entitlements = interaction.entitlements;
        this.custom_id = interaction.data.custom_id;
        this.application_id = interaction.application_id;
        this.type = interaction.type;
        this.version = interaction.version;
        this.locale = interaction.locale;
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
}
