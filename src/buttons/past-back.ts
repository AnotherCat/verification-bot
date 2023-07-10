import { ButtonInteraction, MessageActionRow, MessageButton, MessageEmbed, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { ApplicationData, Button } from "../types";
import { addRole, removeRole, successMessage, followupChannel } from "../settings.json"


const button: Button = {
    customIdLabel: 'past-back',
    async execute(interaction: ButtonInteraction) {
        await interaction.deferUpdate()
        // First get the applicationId from the customId
        const applicationReference = interaction.customId.split(":")[1]
        const currentIndex = parseInt(interaction.customId.split(":")[2])

        // Check the status of the current user, it must be pending or followup
        const application = await prisma.verificationSubmission.findUnique({
            where: {
                reference: applicationReference,

            }
            ,
        })
        if (!application) {
            throw new MessageError("No application found for this user.")
        }

        // Get all applications, from latest to oldest
        const applications = await prisma.verificationSubmission.findMany({
            where: {
                userId: application.userId,
            }, orderBy: { timestamp: "desc" }, // So that zero is the most recent
        })
        // If applications is empty, throw error
        if (!applications || applications.length === 0) {
            throw new MessageError("No historical applications found for this user.")
        }

        // If no more applications before current index 
        if (currentIndex === 0) {
            throw new MessageError("Already at the most recent application.")
        }

        // Get the application
        const latestApplication = applications[currentIndex - 1]

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
                customId: `past-back:${applicationReference}:${currentIndex - 1}`,
                disabled: currentIndex - 1 <= 0
            }),
            new MessageButton({
                label: "Earlier",
                style: "PRIMARY",
                customId: `past-earlier:${applicationReference}:${currentIndex - 1}`,
                disabled: false
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