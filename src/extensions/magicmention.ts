import { APIEmbed, APIInteractionDataOptionBase } from "discord-api-types/v10";
import { AutocompleteContext, SlashCommandContext } from "../classes/CommandContext";
import Extension, { persistent_component, slash_command } from "../classes/Extension";
import { Guilds, MagicMentionUsers } from "../database/schema";
import { getGuildConfig } from "../classes/Functions";
import { ButtonContext } from "../classes/ComponentContext";
import { createHash } from "node:crypto";

async function handleEnableCmd(ctx: SlashCommandContext) {
    const doContinue = await ctx.client.command_premium_wall(ctx);
    if (!doContinue) {
        return;
    }

    if (!ctx.guildId) return; // Not possible, but just in case

    const guildConf = await getGuildConfig(ctx.guildId);

    if (!guildConf.mention_magic) {
        return ctx.reply(
            `This server has not enabled this feature for their server. Ask a server moderator to enable it in the config.`,
            {
                ephemeral: true,
            }
        );
    }

    const existing = await MagicMentionUsers.findOne({ discord_id: ctx.authorID });

    if (!existing) {
        return ctx.reply(
            `You have not linked your TikTok account to your Discord account.\nUse ${ctx.command.mention(
                "link"
            )} command to link your account.`,
            {
                ephemeral: true,
            }
        );
    }

    if (!ctx.guildId || ctx.guildId === undefined || ctx.guildId === null) {
        return ctx.reply("Oops! Something went wrong!", {
            ephemeral: true,
        });
    }

    if (existing.guilds_to_notify.includes(ctx.guildId)) {
        return ctx.reply(`You have already enabled your mentions for this server.`, {
            ephemeral: true,
        });
    }

    existing.guilds_to_notify.push(ctx.guildId);

    await existing.save();

    return ctx.reply(`You have successfully enabled your mentions for this server.`, {
        ephemeral: true,
    });
}

async function handleDisableCmd(ctx: SlashCommandContext) {
    if (!ctx.guildId) return; // Not possible, but just in case

    const existing = await MagicMentionUsers.findOne({ discord_id: ctx.authorID });

    if (!existing) {
        return ctx.reply(
            `You have not linked your TikTok account to your Discord account.\nUse ${ctx.command.mention(
                "link"
            )} command to link your account.`,
            {
                ephemeral: true,
            }
        );
    }

    if (!ctx.guildId || ctx.guildId === undefined || ctx.guildId === null) {
        return ctx.reply("Oops! Something went wrong!", {
            ephemeral: true,
        });
    }

    if (!existing.guilds_to_notify.includes(ctx.guildId)) {
        return ctx.reply(`You have not enabled your mentions for this server.`, {
            ephemeral: true,
        });
    }

    existing.guilds_to_notify = existing.guilds_to_notify.filter(
        (guild_id) => guild_id !== ctx.guildId
    );

    await existing.save();

    return ctx.reply(`You have successfully disabled your mentions for this server.`, {
        ephemeral: true,
    });
}

const textAutoComplete = async function autocomplete(
    ctx: AutocompleteContext,
    focusedOption?: APIInteractionDataOptionBase<3, string>
) {
    async function checkAlreadyLinked(discordId: string) {
        const existing = await MagicMentionUsers.findOne({ discord_id: discordId });
        if (existing) {
            return true;
        } else {
            return false;
        }
    }

    if (!focusedOption) {
        const choices = [
            {
                name: "Start typing a username!",
                value: "ERROR:start_search",
            },
        ];
        if (await checkAlreadyLinked(ctx.authorID)) {
            choices.push({
                name: "--> Want to unlink your TikTok account?",
                value: "QUICKVIDS:UNLINK",
            });
        }

        return ctx.reply({ choices });
    }

    const username = focusedOption.value;

    if (!username || username.length < 2) {
        const choices = [
            {
                name: "Start typing a username!",
                value: "ERROR:start_search",
            },
        ];
        if (await checkAlreadyLinked(ctx.authorID)) {
            choices.push({
                name: "--> Want to unlink your TikTok account?",
                value: "QUICKVIDS:UNLINK",
            });
        }
        return ctx.reply({ choices });
    }

    const user = await ctx.client.ttrequester.fetchUser(null, null, username);

    if (!user) {
        const choices = [
            {
                name: "No users found | Make sure you are NOT using the Nickname",
                value: "QUICKVIDS:CANT_FIND",
            },
            {
                name: "--> Can't find who you are looking for?",
                value: "QUICKVIDS:CANT_FIND",
            },
        ];
        return ctx.reply({ choices });
    }

    const choices = [
        {
            name: `@${user.unique_id} | ${user.follower_count
                .valueOf()
                .toLocaleString()} Followers`,
            value: user.sec_uid,
        },
    ];

    return ctx.reply({ choices });
};

function genCode(inputString: string): number {
    const hash = createHash("sha256").update(inputString).digest("hex");

    const code = (parseInt(hash.slice(0, 4), 16) % 90_000) + 10_000;
    return code;
}

async function handleLinkCmd(ctx: SlashCommandContext) {
    const doContinue = await ctx.client.command_premium_wall(ctx);
    if (!doContinue) {
        return;
    }

    const sec_uid = ctx.getOption("username") as APIInteractionDataOptionBase<3, string>;

    if (sec_uid.value === "QUICKVIDS:CANT_FIND") {
        const error_code = "adwpQcyHvm";
        return ctx.reply(
            `Sorry we couldn't find your TikTok account, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            {
                ephemeral: true,
            }
        );
    }

    if (sec_uid.value === "ERROR:start_search") {
        return ctx.reply("Oops! Use the command again, but this time, start typing a username.", {
            ephemeral: true,
        });
    }

    if (sec_uid.value === "QUICKVIDS:UNLINK") {
        await MagicMentionUsers.deleteOne({ discord_id: ctx.authorID });
        return ctx.reply(
            "You have successfully unlinked your TikTok account from your Discord account.",
            {
                ephemeral: true,
            }
        );
    }

    // if not b64_bytes.startswith(b"1.0.0\x01\x00\x00\x00"):

    const decoded_sec_uid = Buffer.from(sec_uid.value, "base64").toString("utf-8");
    const valid_sec_uid = decoded_sec_uid.startsWith("1.0.0\x01\x00\x00\x00");

    if (!valid_sec_uid) {
        const error_code = "3E9hetCUcc";
        return ctx.reply(
            `Please make sure to use the autocomplete menu, or if it's not working, join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            {
                ephemeral: true,
            }
        );
    }

    const user = await ctx.client.ttrequester.fetchUser(null, sec_uid.value, null);

    if (!user) {
        const error_code = "adwpQcyHvm";
        return ctx.reply(
            `Sorry we couldn't find your TikTok account, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
            {
                ephemeral: true,
            }
        );
    }

    const code = genCode(user.sec_uid + ctx.authorID);

    // check if code in user
    if (!user.signature.includes(code.toString())) {
        let embed: APIEmbed = {
            title: "Wait a minute!",
            description: `We need to make sure you are actually [@${user.unique_id}](${user.share_info.share_url}) 🕵️`,
            fields: [
                {
                    name: "So what do I do?",
                    value: `Please add this code to your TikTok bio: **\`${code}\`**`,
                },
                {
                    name: "How do I do that?",
                    value: "Check out this [TikTok video](https://www.tiktok.com/@savethatvideo/video/7145990005238861099) for help.",
                },
                {
                    name: "Heads Up!",
                    value: "TikTok can take a little bit of time to publish your bio change, so please be patient with the re-check button.",
                },
            ],
            thumbnail: {
                url: user.avatar_larger.url_list[0],
            },
            footer: {
                text: "Don't worry, you can change your bio back after you've linked your account.",
            },
        };
        const button = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 1,
                    label: "Verify",
                    custom_id: `verify${user.sec_uid}`,
                },
            ],
        };

        return ctx.reply(
            {
                embeds: [embed],
                components: [button],
            },
            {
                ephemeral: true,
            }
        );
    }

    const existingLink = await MagicMentionUsers.findOne({ tt_sec_uid: user.sec_uid });

    if (existingLink) {
        if (existingLink.discord_id.toString() === ctx.authorID) {
            return ctx.reply("You have already linked this account to your Discord account.", {
                ephemeral: true,
            });
        } else {
            return ctx.reply("This TikTok account is already linked to another Discord account.", {
                ephemeral: true,
            });
        }
    }

    const existing = await MagicMentionUsers.findOne({ discord_id: ctx.authorID });

    if (existing) {
        existing.tt_sec_uid = user.sec_uid;
        existing.tt_uid = user.uid;
        await existing.save();
    } else {
        await MagicMentionUsers.create({
            discord_id: ctx.authorID,
            tt_sec_uid: user.sec_uid,
            tt_uid: user.uid,
        });
    }

    const embed: APIEmbed = {
        title: "🎉 Success!",
        description: `You have successfully linked your TikTok account to your Discord account!\nDon't forget to enable your Magic Mentions for this server (if you want)`,
        color: ctx.client.COLORS.BLURPLE,
        fields: [
            {
                name: "Next Steps",
                value: `1. You can use ${ctx.command.mention(
                    "enable"
                )} to enable your Magic Mentions for any server\n2. Remove the code from your bio`,
            },
        ],
        footer: {
            text: "You can unlink your account with /mention link",
        },
    };

    return ctx.reply(
        {
            embeds: [embed],
            components: [],
        },
        {
            ephemeral: true,
        }
    );
}

async function handleViewCmd(ctx: SlashCommandContext) {
    const existing = await MagicMentionUsers.findOne({ discord_id: ctx.authorID });
    console.log(existing);

    if (!existing) {
        return ctx.reply(
            `You have not linked your TikTok account to your Discord account.\nUse ${ctx.command.mention(
                "link"
            )} command to link your account.`,
            {
                ephemeral: true,
            }
        );
    }

    if (existing.guilds_to_notify.length < 1) {
        return ctx.reply(
            `You have not enabled your mentions for any servers. Use ${ctx.command.mention(
                "enable"
            )} to enable them.`,
            {
                ephemeral: true,
            }
        );
    }

    let guilds: Guilds[] = [];

    for (const guild_id of existing.guilds_to_notify) {
        const guild = await ctx.client.getGuild(guild_id);
        if (guild) {
            guilds.push(guild);
        }
    }

    let message = `You have enabled your mentions for ${guilds.length} servers.\n\n`;
    let link = "https://discord.com/channels/{guild}/{channel}";

    for (const guild of guilds) {
        const guildConf = await getGuildConfig(guild.guild_id);
        const channel = guildConf.mention_magic?.channel_id;
        if (channel) {
            message += `- [${guild.name}](${link
                .replace("{guild}", guild.guild_id)
                .replace("{channel}", channel)})\n`;
        } else {
            message += `- ${guild.name}\n`;
        }
    }

    const embed: APIEmbed = {
        title: "Your Magic Mentions",
        description: message,
        color: ctx.client.COLORS.BLURPLE,
        footer: {
            text: "You can disable your mentions with /mention disable",
        },
    };

    return ctx.reply(
        {
            embeds: [embed],
            components: [],
        },
        {
            ephemeral: true,
        }
    );
}

export default class MentionMagic extends Extension {
    name = "mentionmagic";

    @slash_command({
        name: "mention",
        description: "Mention Magic alllow you to mention the bot on TikTok and send to channel",
        options: [
            {
                name: "link",
                description: "Link your TikTok account to your Discord account",
                type: 1,
                options: [
                    {
                        name: "username",
                        description:
                            "Type in your username, nickname will work, but it's better to use your username",
                        type: 3,
                        autocomplete: true,
                        required: true,
                    },
                ],
            },
            {
                name: "view",
                description: "View what servers you have enabled your mentions for",
                type: 1,
            },
            {
                name: "enable",
                description: "Enable your mentions for this server",
                type: 1,
            },
            {
                name: "disable",
                description: "Disable your mentions for this server",
                type: 1,
            },
        ],
        autocompleteCallbacks: [
            {
                option_name: "username",
                callback: textAutoComplete,
            },
        ],
    })
    async mention(ctx: SlashCommandContext): Promise<void> {
        console.log(JSON.stringify(ctx.rawData));

        if (ctx.getOption("link")) {
            return handleLinkCmd(ctx);
        } else if (ctx.getOption("view")) {
            return handleViewCmd(ctx);
        } else if (ctx.getOption("enable")) {
            return handleEnableCmd(ctx);
        } else if (ctx.getOption("disable")) {
            return handleDisableCmd(ctx);
        } else {
            return ctx.reply("Oops! Something went wrong!", {
                ephemeral: true,
            });
        }
        
    }

    @persistent_component({ custom_id: /verify(.*)/ })
    async verify(ctx: ButtonContext): Promise<void> {
        console.log(ctx.custom_id);
        const sec_uid = ctx.custom_id.slice(6);

        const user = await ctx.client.ttrequester.fetchUser(null, sec_uid, null);

        if (!user) {
            const error_code = "adwpQcyHvm";
            return ctx.reply(
                `Sorry we couldn't find your TikTok account, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
                {
                    ephemeral: true,
                }
            );
        }

        const code = genCode(user.sec_uid + ctx.authorID);

        if (!user.signature.includes(code.toString())) {
            const error_code = "A2kZmqwKuu";

            return ctx.reply(
                `We still can't find the code in your bio, please make sure you added \`${code}\` to your bio and try again. (Bio changes can take a few minutes)\n\nIf you are still having issues, come join our [Support Server](<https://discord.gg/${error_code}>)\n\nError Code: \`${error_code}\``,
                { ephemeral: true }
            );
        }

        const existingLink = await MagicMentionUsers.findOne({ tt_sec_uid: user.sec_uid });

        if (existingLink) {
            if (existingLink.discord_id.toString() === ctx.authorID) {
                return ctx.reply("You have already linked this account to your Discord account.", {
                    ephemeral: true,
                });
            } else {
                return ctx.reply(
                    "This TikTok account is already linked to another Discord account.",
                    {
                        ephemeral: true,
                    }
                );
            }
        }

        const existing = await MagicMentionUsers.findOne({ discord_id: ctx.authorID });

        if (existing) {
            existing.tt_sec_uid = user.sec_uid;
            existing.tt_uid = user.uid;
            await existing.save();
        } else {
            await MagicMentionUsers.create({
                discord_id: ctx.authorID,
                tt_sec_uid: user.sec_uid,
                tt_uid: user.uid,
            });
        }

        const mentionCommand = ctx.client.getCommand("mention");

        const embed: APIEmbed = {
            title: "🎉 Success!",
            description: `You have successfully linked your TikTok account to your Discord account!\nDon't forget to enable your Magic Mentions for this server (if you want)`,
            color: ctx.client.COLORS.BLURPLE,
            fields: [
                {
                    name: "Next Steps",
                    value: `1. You can use ${mentionCommand?.mention(
                        "enable"
                    )} to enable your Magic Mentions for any server\n2. Remove the code from your bio`,
                },
            ],
            footer: {
                text: "You can unlink your account with /mention link",
            },
        };

        return ctx.reply(
            {
                embeds: [embed],
                components: [],
            },
            {
                ephemeral: true,
            }
        );
    }
}
