/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'node:fs';
import path from 'node:path';
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { Client, Collection, CommandInteraction, GatewayIntentBits, MessageComponentInteraction, EmbedBuilder, ModalSubmitInteraction, Events, Partials } from 'discord.js';

import { ApplicationCommand, Button, Modal } from './types';
import { PrismaClient } from '@prisma/client';
import { MessageError } from './errors';
import { embedBlue, embedRed } from './const';
import { onLeave } from './events/leave';
import envSchema, { JSONSchemaType } from 'env-schema';



interface Env {
	CLIENT_ID: string;
	GUILD_ID: string;
	TOKEN: string;
	REVIEW_CHANNEL: string;
	FOLLOWUP_CHANNEL: string;
	RAISE_CHANNEL: string;
	APPROVE_LOG_CHANNEL: string;
	RAISE_ROLE: string;
	REVIEWER_ROLE: string;
	FOLLOWUP_PING_ROLE: string;
	ADD_ROLE: string;
	REMOVE_ROLE: string;
	SUCCESS_CHANNEL_ID: string;
	SUCCESS_MESSAGE: string;
	SENTRY_DSN: string;

}
const schema: JSONSchemaType<Env> = {
	type: 'object',
	// all required
	required: [
		'CLIENT_ID',
		'GUILD_ID',
		'TOKEN',
		'REVIEW_CHANNEL',
		'FOLLOWUP_CHANNEL',
		'RAISE_CHANNEL',
		'APPROVE_LOG_CHANNEL',
		'RAISE_ROLE',
		'REVIEWER_ROLE',
		'FOLLOWUP_PING_ROLE',
		'ADD_ROLE',
		'REMOVE_ROLE',
		'SUCCESS_CHANNEL_ID',
		'SUCCESS_MESSAGE',
		"SENTRY_DSN"
	],
	properties: {
		CLIENT_ID: { type: 'string', },
		GUILD_ID: { type: 'string', },
		TOKEN: { type: 'string', },
		REVIEW_CHANNEL: { type: 'string', },
		FOLLOWUP_CHANNEL: { type: 'string', },
		RAISE_CHANNEL: { type: 'string', },
		APPROVE_LOG_CHANNEL: { type: 'string', },
		RAISE_ROLE: { type: 'string', },
		REVIEWER_ROLE: { type: 'string', },
		FOLLOWUP_PING_ROLE: { type: 'string', },
		ADD_ROLE: { type: 'string', },
		REMOVE_ROLE: { type: 'string', },
		SUCCESS_CHANNEL_ID: { type: 'string', },
		SUCCESS_MESSAGE: { type: 'string', },
		SENTRY_DSN: { type: 'string' }
	}
}

const config = envSchema({
	schema: schema,
	dotenv: true // load .env if it is there, default: false
	// or you can pass DotenvConfigOptions
	// dotenv: {
	//   path: '/custom/path/to/.env'
	// }
})

export const prisma = new PrismaClient()

Sentry.init({
	dsn: config.SENTRY_DSN,
	integrations: [
		new ProfilingIntegration(),
		new Sentry.Integrations.Prisma({ client: prisma })
	],
	// Performance Monitoring
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Set sampling rate for profiling - this is relative to tracesSampleRate
	profilesSampleRate: 1.0,
});



const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], partials: [Partials.GuildMember] });


// use env-schema to validate process.env



const commands: Collection<string, ApplicationCommand> = new Collection();
const buttons: Collection<string, Button> = new Collection();
const modals: Collection<string, Modal> = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);

	const command = require(filePath) as ApplicationCommand;

	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	commands.set(command.data.name, command);
}

const buttonsPath = path.join(__dirname, 'buttons');
const buttonFiles = fs
	.readdirSync(buttonsPath)
	.filter((file) => file.endsWith('.js'));

for (const file of buttonFiles) {
	const filePath = path.join(buttonsPath, file);
	const button = require(filePath) as Button;

	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	buttons.set(button.customIdLabel, button);
}

const modalsPath = path.join(__dirname, 'modals');
const modalFiles = fs

	.readdirSync(modalsPath)
	.filter((file) => file.endsWith('.js'));

for (const file of modalFiles) {
	const filePath = path.join(modalsPath, file);
	const modal = require(filePath) as Modal;

	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	modals.set(modal.customIdLabel, modal);
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

// Integer colors



const handleInteractionError = async (
	interaction: MessageComponentInteraction | CommandInteraction | ModalSubmitInteraction,
	error: Error | MessageError,
) => {
	let message: string;
	let color: number
	if (error instanceof MessageError) {
		message = error.message;
		color = embedBlue
	} else {
		// If is MessageError then this is used to send an expected error to the user
		console.error(error);
		message = `There was an error while executing this interaction!\nError: ${error.message}`;
		color = embedRed
	}
	/* If the interaction is in a deferred loading state it will be "deferred" but not "replied" and so update the loading message
	If the interaction is not deferred or replied to then reply to it
	Otherwise the interaction has been replied to so send a followup
  */
	const embed = new EmbedBuilder({
		description: message,
		color
	})
	// Check if the interaction is a component interaction, and if so send a followup 
	if (interaction.deferred && !interaction.replied) {
		// if interaction is component or select or modal than send a reply
		// Otherwise edit reply
		if (interaction.isMessageComponent() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {

			await interaction.followUp({
				embeds: [embed],
				ephemeral: true,
			});
		} else {
			await interaction.editReply({
				embeds: [embed]
			});
		}
	} else if (!interaction.replied) {
		await interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	} else {
		await interaction.followUp({
			embeds: [embed],
			ephemeral: true,
		});
	}
};

client.on("raw", async (event) => {
	event
})

client.on('interactionCreate', async (interaction) => {

	if (interaction.isCommand()) {

		const command = commands.get(interaction.commandName);

		if (!command) {
			await interaction.reply({
				content: "Command not found",
				ephemeral: true
			})
			return
		}

		try {
			await command.execute(interaction);
		}
		catch (error) {
			await handleInteractionError(interaction, error)
		}
	} else if (interaction.isMessageComponent() && interaction.isButton()) {
		const identifier = interaction.customId.split(":")[0];
		const button = buttons.get(identifier);
		if (!button) {
			await interaction.reply({
				content: "Button custom-id not found",
				ephemeral: true
			})
			return
		}
		try {
			await button.execute(interaction);
		}
		catch (error) {
			await handleInteractionError(interaction, error)
		}
	} else if (interaction.isModalSubmit()) {
		const identifier = interaction.customId.split(":")[0];
		const modal = modals.get(identifier);
		if (!modal) {
			await interaction.reply({
				content: "Modal custom-id not found",
				ephemeral: true
			})
			return
		}
		try {
			await modal.execute(interaction);
		}
		catch (error) {
			await handleInteractionError(interaction, error)
		}
	}
});


client.on(Events.GuildMemberRemove, async (event) => {
	await onLeave(event)
})


// Login to Discord with your client's token
client.login(config.TOKEN);


export { config }