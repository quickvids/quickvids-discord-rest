import Logger from "./Logger";
import { fastify, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyRateLimit, { RateLimitOptions } from "@fastify/rate-limit";
import {
    APIInteraction,
    ApplicationCommandType,
    InteractionResponseType,
    InteractionType,
} from "discord-api-types/v10";
import { verify } from "discord-verify/node";
import Client from "./Client";

import crypto from "node:crypto";
import {
    APIApplicationCommandAutocompleteInteractionWithEntitlements,
    APIChatInputApplicationCommandInteractionWithEntitlements,
    APIContextMenuInteractionWithEntitlements,
} from "../types/premium";
import Database from "./Database";
import { AutocompleteContext, ContextMenuContext, SlashCommandContext } from "./CommandContext";

const rateLimitConfig: RateLimitOptions = {
    max: 5,
    timeWindow: 5 * 1000,
};

export default class Server {
    port: number;
    console: Logger;
    router: FastifyInstance;
    database: Database;
    client: Client;

    constructor(port: number, database: Database, client: Client) {
        this.port = port;
        this.console = new Logger("Server");
        this.router = fastify({ logger: false, trustProxy: true });
        this.client = client;
        this.database = database;
    }

    async start(): Promise<void> {
        this.console.info("Starting server...");
        await this.database.start();
        this.client.start();

        await this.router.register(fastifyRateLimit, { global: false });
        this.registerRoutes();

        this.router.listen({ port: this.port, host: "0.0.0.0" }, (err, address) => {
            if (err) throw err;
            this.console.success(`Listening for requests at ${address}!`);
        });
    }

    registerRoutes() {
        this.router.post("/interactions", this.handleRequest.bind(this));

        this.router.get("/", (_, res) => res.redirect("https://quickvids.win"));
    }

    async handleRequest(
        req: FastifyRequest<{
            Body: APIInteraction;
            Headers: {
                "x-signature-ed25519": string;
                "x-signature-timestamp": string;
            };
        }>,
        res: FastifyReply
    ) {
        // Verify Request is from Discord
        const signature = req.headers["x-signature-ed25519"];
        const timestamp = req.headers["x-signature-timestamp"];

        const rawBody = JSON.stringify(req.body);

        if (!this.client) return res.code(401).send("Invalid request");

        const isValidRequest = await verify(
            rawBody,
            signature,
            timestamp,
            this.client.publicKey,
            crypto.webcrypto.subtle
        );
        if (!isValidRequest) return res.code(401).send("Invalid signature");

        const interaction = req.body;

        // If interaction is a ping (url verification)
        if (interaction.type === InteractionType.Ping)
            return res.send({ type: InteractionResponseType.Pong });

        if (interaction.type === InteractionType.ApplicationCommand) {
            if (interaction.data.type === ApplicationCommandType.ChatInput) {
                const ctx = new SlashCommandContext(
                    interaction as APIChatInputApplicationCommandInteractionWithEntitlements,
                    this.client,
                    res
                );
                await this.client.handleCommand(ctx);
            } else if (
                interaction.data.type === ApplicationCommandType.Message ||
                interaction.data.type === ApplicationCommandType.User
            ) {
                const ctx = new ContextMenuContext(
                    interaction as APIContextMenuInteractionWithEntitlements,
                    this.client,
                    res
                );
                await this.client.handleCommand(ctx);
            }
        }

        if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
            const ctx = new AutocompleteContext(
                interaction as APIApplicationCommandAutocompleteInteractionWithEntitlements,
                this.client,
                res
            );
            await this.client.handleAutocomplete(ctx);
        }
        // else if (
        //     interaction.type === InteractionType.MessageComponent &&
        //     interaction.data.component_type === ComponentType.Button
        // ) {
        //     // If the interaction is a button
        //     const ctx = new ButtonContext(
        //         interaction as APIMessageComponentInteractionWithEntitlements,
        //         this.client,
        //         res
        //     );
        //     await this.client.handleButton(ctx);
        // } else if (interaction.type === InteractionType.ModalSubmit) {
        //     const ctx = new ModalContext(
        //         interaction as APIModalSubmitInteraction,
        //         this.client,
        //         res
        //     );
        //     await this.client.paranoiaHandler.handleModal(ctx);
        // }
    }
}
