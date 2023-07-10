import { SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommand } from '../types';

const command: ApplicationCommand = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
}

module.exports = command
