import { ButtonInteraction, MessageActionRow, MessageButton, MessageEmbed, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { ApplicationData, Button } from "../types";
import { addRole, removeRole, successMessage, followupChannel } from "../settings.json"


const button: Button = {
    customIdLabel: 'view-past',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferReply({ ephemeral: true })
        // First get the applicationId from the customId
        const applicationReference = interaction.customId.split(":")[1]

        // Check the status of the current user, it must be pending or followup
        const application = await prisma.verificationSubmission.findUnique({
            where: {
                reference: applicationReference,

            }
        })
        if (!application) {
            throw new MessageError("No application found for this user.")
        }

        // Get all applications, from latest to oldest
        const applications = await prisma.verificationSubmission.findMany({
            where: {
                userId: application.userId,
            }, orderBy: { timestamp: "desc" }
        })
        // If applications is empty, throw error
        if (!applications || applications.length === 0) {
            throw new MessageError("No historical applications found for this user.")
        }

        // Get the latest application
        const latestApplication = applications[0]

        const applicationData = latestApplication.data as unknown as ApplicationData

        // Show details of the latest application
        const embed = new MessageEmbed()
            .setTitle("Past application details")
            .setColor(embedGreen)
            .setDescription(
                `**User:** <@${latestApplication.userId}>\n` +
                `**Status:** ${latestApplication.status}\n` +
                `\n__**Application**__:\n**Age**: ${applicationData.age}`
                + `\n**Pronouns**: ${applicationData.pronouns}`
                + `\n**Identity**: ${applicationData.identity}`
                + `\n**Reason**: ${applicationData.reason}`
                + `\n\n**Date Submitted**: <t:${Math.round(latestApplication.timestamp.getTime() / 1000)}:F>`



            )

        const components = [
            new MessageButton({
                label: "Back",
                style: "PRIMARY",
                customId: `past-back:${applicationReference}:0`,
                disabled: true
            }),
            new MessageButton({
                label: "Earlier",
                style: "PRIMARY",
                customId: `past-earlier:${applicationReference}:0`,
                disabled: applications.length <= 1 // Only show next if there is more than one application
            })
        ]

        await interaction.editReply({
            embeds: [embed],
            components: [new MessageActionRow().setComponents(components)]
        }
        )




    },
};
module.exports = button