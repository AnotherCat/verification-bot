import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import { prisma } from "..";
import { embedBlue } from "../const";
import { MessageError } from "../errors";
import { Button } from "../types";


const button: Button<true> = {
	customIdLabel: 'submit-application',
	settingsRequired: true,
	async execute(interaction) {
		// Check if the current user has a pending or raised application 
		const application = await prisma.verificationSubmission.findFirst({
			where: {
				userId: BigInt(interaction.member.user.id),
			},
			orderBy: { creationTimestamp: "desc" },
		})
		if (application && (application.status === "PENDING" || application.status === "RAISED" || application.status === "FOLLOWUP")) {
			throw new MessageError("You already have a pending application, please wait for that to be reviewed.")
		}
		// Reply with a confirmation message for the rules

		await interaction.reply({
			embeds: [new EmbedBuilder({ description: 'Please review the <#843489404047589386> and agree to them before continuing.', color: embedBlue })],
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