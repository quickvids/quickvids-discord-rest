import crypto from "crypto";
import {
    APIApplicationCommandInteractionDataStringOption
} from "discord-api-types/v10";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";

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
    const input = ctx.data.options[0] as APIApplicationCommandInteractionDataStringOption;
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
