import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import { prisma } from "..";
import { embedBlue } from "../const";
import { MessageError } from "../errors";
import { Button } from "../types";


const button: Button = {
	customIdLabel: 'submit-application',
	async execute(interaction: ButtonInteraction) {

		if (!interaction.guild || !interaction.member) {
			throw new Error("This command can only be used in a server.");
		}
		// Check if the current user has a pending or raised application 
		const application = await prisma.verificationSubmission.findFirst({
			where: {
				userId: BigInt(interaction.member.user.id),
			},
			orderBy: { timestamp: "desc" },
		})
		if (application && (application.status === "PENDING" || application.status === "RAISED" || application.status === "FOLLOWUP")) {
			throw new MessageError("You already have a pending application, please wait for that to be reviewed.")
		}
		// Reply with a confirmation message for the rules

		await interaction.reply({
			embeds: [new EmbedBuilder({ description: 'Please review the #rules and agree to them before continuing.', color: embedBlue })],
			components: [new ActionRowBuilder<ButtonBuilder>().setComponents(
				[
					new ButtonBuilder()
						.setCustomId("submit-application-confirm")
						.setLabel("Agree")
						.setStyle(ButtonStyle.Success)
				]
			)
			],
			ephemeral: true
		});
	},
};
module.exports = button