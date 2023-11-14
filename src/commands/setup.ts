import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ApplicationCommand } from '../types';


const command: ApplicationCommand = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Setup config')
		/*.addChannelOption((option) =>
			option.setName('prompt-channel')
				.setDescription('The channel to send the prompt to. - Should be visible to all who need to go through verification.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true),
		)
		.addChannelOption((option) =>
			option.setName('response-channel')
				.setDescription('The channel to send verification requests to be reviewed. - Should only be visible to reviewers.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true))

		.addRoleOption((option) =>
			option.setName('reviewer-role')
				.setDescription('The role to allow a user to review verifications.')
				.setRequired(true))
		.addChannelOption((option) =>
			option.setName('extra-review-channel')
				.setDescription('Channel to open private thread for followup reviews. - Both should be able to view.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false))
		.setDMPermission(false)*/
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),


	async execute(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new ActionRowBuilder<ButtonBuilder>().setComponents([
					new ButtonBuilder()
						.setCustomId("submit-application")
						.setLabel("Submit Application")
						.setStyle(ButtonStyle.Primary)
				])], content: "SUBMIT APPLICATION"
		})
	}
}

module.exports = command