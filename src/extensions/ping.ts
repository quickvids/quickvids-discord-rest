import { APIInteractionDataOptionBase } from "discord-api-types/v10";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";
import crypto from "crypto";

// Function to generate a random string of a specified length
const generateRandomString = (length: number = 10): string => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
};

// Function to hash a string using SHA-256
const hashString = (str: string): string => {
    const hash = crypto.createHash("sha256");
    hash.update(str);
    return hash.digest("hex");
};

const autocomplete_autocomplete = async (ctx: AutocompleteContext): Promise<void> => {
    const input = ctx.data.options[0].value;
    const choices: string[] = [];

    for (let i = 0; i < 3; i++) {
        const randomString = generateRandomString();
        const hashedString = hashString(input + randomString);
        choices.push(hashedString);
    }

    return ctx.reply({
        choices: choices.map((choice) => {
            return {
                name: choice,
                value: choice,
            };
        }),
    });
};

export default class Ping extends Extension {
    name = "ping";

    @slash_command({
        name: "sample_autocomplete",
        description: "generates random choices",
        options: [
            {
                name: "input",
                description: "Start typing to generate random choices",
                type: 3,
                required: true,
                autocomplete: true,
            },
        ],
        autocompleteCallbacks: [
            {
                option_name: "input",
                callback: autocomplete_autocomplete,
            },
        ],
    })
    async autocomplete_test(ctx: SlashCommandContext): Promise<void> {
        const input = ctx.getOption("input") as APIInteractionDataOptionBase<3, string>;
        return ctx.reply({
            content: `You chose ${input.value}`,
        });
    }

    @slash_command({
        name: "ping",
        description: "Check if the bot is online.",
    })
    async ping(ctx: SlashCommandContext): Promise<void> {
        return ctx.reply({
            embeds: [
                {
                    description: `🏓 **Pong!** The bot is online.`,
                    color: ctx.client.COLORS.BLURPLE,
                },
            ],
        });
    }
}