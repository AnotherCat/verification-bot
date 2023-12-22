import { SlashCommandBuilder, } from '@discordjs/builders';
import { PermissionFlagsBits, ChannelType } from 'discord-api-types/v10';
import { ApplicationCommand } from '../types';
import { prisma } from '..';


const command: ApplicationCommand<false> = {
	settingsRequired: false,
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Setup config')

		.addChannelOption((option) =>
			option.setName('review-channel')
				.setDescription('The channel to send verification requests to be reviewed. - Should only be visible to reviewers.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option.setName('followup-channel')
				.setDescription('Channel to open followup threads in. Visible to both reviewers and users.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option.setName('raise-channel')
				.setDescription('The channel to open raised application threads in. - Should only be visible to reviewers.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option.setName('log-channel')
				.setDescription('The channel to send logs too. - Should only be visible to reviewers.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option.setName('reviewer-role')
				.setDescription('The role to allow a user to review applications.')
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option.setName('raise-role')
				.setDescription('The role to allow a user to manage raised applications (typically moderators).')
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option.setName('verified-role')
				.setDescription('The role to give a user once they have been verified.')
				.setRequired(false)
		)
		.addRoleOption((option) =>
			option.setName('unverified-role')
				.setDescription('The role to remove from a user once they have been verified.')
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option.setName('success-channel')
				.setDescription('The channel to send success messages too.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option.setName('success-message')
				.setDescription('The message to send to the success channel.')
				.setRequired(false)
		)
		.addChannelOption((option) =>
			option.setName('prompt-channel')
				.setDescription('The channel to send the prompt to. - Should be visible to all who need to go through verification.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false),
		)
		.addStringOption((option) =>
			option.setName('prompt-message')
				.setDescription('The message to send to the prompt channel.')
				.setRequired(false)
		)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),


	async execute(interaction) {
		// TODO: Set settings here :0
		// review channel and no other channel can be the same
		// get the data from the command
		if (interaction.isChatInputCommand()) {
			const settings = await prisma.guildSettings.findUnique({
				where: {
					guildId: BigInt(interaction.guildId)
				}
			})
			const reviewChannelId = interaction.options.getChannel('review-channel', false)?.id ?? settings?.reviewChannelId
			const followupChannelId = interaction.options.getChannel('followup-channel', false)?.id ?? settings?.followUpChannelId
			const raiseChannelId = interaction.options.getChannel('raise-channel', false)?.id ?? settings?.raiseChannelId
			const logChannelId = interaction.options.getChannel('log-channel', false)?.id ?? settings?.logChannelId
			const reviewerRoleId = interaction.options.getRole('reviewer-role', false)?.id ?? settings?.reviewerRoleId
			const raiseRoleId = interaction.options.getRole('raise-role', false)?.id ?? settings?.raiseRoleId
			const verifiedRoleId = interaction.options.getRole('verified-role', false)?.id ?? settings?.addRoleId
			const unverifiedRoleId = interaction.options.getRole('unverified-role', false)?.id ?? settings?.removeRoleId
			const successChannelId = interaction.options.getChannel('success-channel', false)?.id ?? settings?.successMessageChannelId
			const successMessage = interaction.options.getString('success-message', false) ?? settings?.successMessageContent
			const promptChannelId = interaction.options.getChannel('prompt-channel', false)?.id
			const promptMessage = interaction.options.getString('prompt-message', false)

			// check if the review channel is the same as any other channel
			/*if (reviewChannelId !== null && (reviewChannelId === followupChannelId || reviewChannelId === raiseChannelId || reviewChannelId === logChannelId || reviewChannelId === successChannelId || reviewChannelId === promptChannelId)) {
				interaction.reply({ content: 'The review channel cannot be the same as any other channel!!!', ephemeral: true })
				return
			}*/
			// set the settings
			await prisma.guildSettings.upsert({
				where: {
					guildId: BigInt(interaction.guildId)
				},
				create: {
					reviewChannelId: reviewChannelId ? BigInt(reviewChannelId) : undefined,
					followUpChannelId: followupChannelId ? BigInt(followupChannelId) : undefined,
					raiseChannelId: raiseChannelId ? BigInt(raiseChannelId) : undefined,
					logChannelId: logChannelId ? BigInt(logChannelId) : undefined,
					reviewerRoleId: reviewerRoleId ? BigInt(reviewerRoleId) : undefined,
					raiseRoleId: raiseRoleId ? BigInt(raiseRoleId) : undefined,
					addRoleId: verifiedRoleId ? BigInt(verifiedRoleId) : undefined,
					removeRoleId: unverifiedRoleId ? BigInt(unverifiedRoleId) : undefined,
					successMessageChannelId: successChannelId ? BigInt(successChannelId) : undefined,
					successMessageContent: successMessage,
					promptChannelId: promptChannelId ? BigInt(promptChannelId) : undefined,
					promptMessageContent: promptMessage,
					guild: {
						connectOrCreate: {
							where: {
								id: BigInt(interaction.guildId)
							},
							create: {
								id: BigInt(interaction.guildId)
							}
						}
					}

				},
				update: {

					reviewChannelId: reviewChannelId ? BigInt(reviewChannelId) : undefined,
					followUpChannelId: followupChannelId ? BigInt(followupChannelId) : undefined,
					raiseChannelId: raiseChannelId ? BigInt(raiseChannelId) : undefined,
					logChannelId: logChannelId ? BigInt(logChannelId) : undefined,
					reviewerRoleId: reviewerRoleId ? BigInt(reviewerRoleId) : undefined,
					raiseRoleId: raiseRoleId ? BigInt(raiseRoleId) : undefined,
					addRoleId: verifiedRoleId ? BigInt(verifiedRoleId) : undefined,
					removeRoleId: unverifiedRoleId ? BigInt(unverifiedRoleId) : undefined,
					successMessageChannelId: successChannelId ? BigInt(successChannelId) : undefined,
					successMessageContent: successMessage,
					promptChannelId: promptChannelId ? BigInt(promptChannelId) : undefined,
					promptMessageContent: promptMessage
				}
			}
			)

			await interaction.reply({ content: 'Settings updated!', ephemeral: true })



		}
	}
}

module.exports = command