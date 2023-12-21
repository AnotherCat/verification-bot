
import fs from 'node:fs';
import path from 'node:path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { config } from '.';

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.js'));


async function allTheStuff() {

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		await import(filePath).then((command) => {
			// @ts-expect-error not sure why this is happening
			commands.push(command.default.data.toJSON());
		});
	}


	const rest = new REST({ version: '10' }).setToken(config.TOKEN);

	rest
		.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands })
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);

}

allTheStuff().then(() => console.log("All Done!"))
