import {
    APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";
import { SlashCommandContext } from "../classes/CommandContext";
import Extension, { slash_command } from "../classes/Extension";
import { getAccount } from "../classes/Functions";
import { DiscordEmbedLogs } from "../database/schema";


async function handleUsageDataCmd(ctx: SlashCommandContext) {

    await ctx.defer({ephemeral: true})

    const choice = ctx.getOption("collect") as APIApplicationCommandInteractionDataStringOption;

    const user = await getAccount(ctx.user.id, true)
    if (!user) {
        return ctx.reply("An error occurred while fetching your account data. Please try again later.");
    }

    if (choice === undefined) {
        const state = user.log_usage_data ? "Opted-in" : "Opted-out";
        return ctx.reply(`You are currently: ${state} \n\n**We take your privacy seriously.**\nYour data is not public. Usage data provides statistics like total videos converted and total users. Please consider sharing your usage data with us to help improve our app. View the policy command for more information on how we handle your privacy.`);
    }

    switch (choice.value) {
        case "yes":
            console.log("Collecting data...");
            user.log_usage_data = true;
            await user.save();

            return ctx.reply("You have opted in to data collection. Thank you for your support! 🎉")

        case "no":
            user.log_usage_data = false;
            await user.save();

            return ctx.reply("You have opted out of data collection. We respect your privacy. 🛡️")

        case "delete":
            user.log_usage_data = false;
            user.logs?.forEach(async (log) => {
                const logDoc = await DiscordEmbedLogs.findById(log);
                if (!logDoc) return;
                logDoc.user_id = undefined;
                logDoc.channel_id = "unknown";
                await logDoc.save();
            });
            user.logs = [];
            await user.save();

            return ctx.reply("You have opted out of data collection and your usage data has been deleted. We respect your privacy. 🛡️")
    }
}


export default class PersonalSettings extends Extension {
    name = "personal_settings";



    @slash_command({
        name: "privacy",
        description: "Inform yourself of some of the data we collect.",
        options: [
            {
                name: "policy",
                description: "Review our Privacy Policy.",
                type: 1,
            },
            {
                name: "usage",
                description: "Manage your data usage settings.",
                type: 2,
                options: [
                    {
                        name: "data",
                        description: "Choose what we do with your data.",
                        type: 1,
                        options: [
                            {
                                name: "collect",
                                description: "Which option best describes your data collection preference?",
                                type: 3,
                                choices: [
                                    {
                                        name: "Yes (collect data)",
                                        value: "yes"
                                    },
                                    {
                                        name: "No (do not collect identifiable data)",
                                        value: "no"
                                    },
                                    {
                                        name: "Delete (delete usage data & opt out)",
                                        value: "delete"
                                    }
                                ]
                            }
                        ]
                    },
                ]
            }
        ]
    })
    async privacy_cmd(ctx: SlashCommandContext): Promise<void> {
        if (ctx.getOption("policy")) {
            return ctx.reply("Our Privacy Policy can be found at https://quickvids.app/privacy", { ephemeral: true });
        } else if (ctx.getOption("usage")) {
            // Handle usage data
            handleUsageDataCmd(ctx);
        }
    }
}