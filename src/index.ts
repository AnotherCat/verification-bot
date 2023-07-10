import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, CommandInteraction, Intents, Interaction, MessageComponentInteraction, MessageEmbed, ModalSubmitInteraction } from 'discord.js';
import { token } from './config.json';
import { ApplicationCommand, Button, Modal } from './types';
import { PrismaClient } from '@prisma/client';
import { MessageError } from './errors';
import { APIGuildInteraction } from 'discord-api-types/v9';
import { embedBlue, embedRed } from './const';

export const prisma = new PrismaClient()

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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
	const embed = new MessageEmbed({
		description: message,
		color
	})
	// Check if the interaction is a component interaction, and if so send a followup 
	if (interaction.deferred && !interaction.replied) {
		// if interaction is component or select or modal than send a reply
		// Otherwise edit reply
		if (interaction.isMessageComponent() || interaction.isSelectMenu() || interaction.isModalSubmit()) {

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
		};

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
		};
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
		};
		try {
			await modal.execute(interaction);
		}
		catch (error) {
			await handleInteractionError(interaction, error)
		}
	}
});

// Login to Discord with your client's token
client.login(token);
