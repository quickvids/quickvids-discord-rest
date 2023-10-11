import { readdirSync } from "fs";
import Extension from "./classes/Extension";

async function test() {
    const commandFileNames = readdirSync(`${__dirname}/commands_new`).filter(
        (f) => f.endsWith(".ts") || f.endsWith(".js")
    );
    const globalCommands: any[] = [];
    const guildOnly: { [id: string]: any[] } = {};
    for (const commandFileName of commandFileNames) {
        const extension = new (
            await import(`./commands_new/${commandFileName}`)
        ).default() as Extension;
        console.log(extension.name);
    }
}

await test();
