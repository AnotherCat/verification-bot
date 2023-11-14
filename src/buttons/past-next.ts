import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { ApplicationData, Button } from "../types";


const button: Button = {
    customIdLabel: 'past-earlier',
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

        // If no more applications after current index 
        if (applications.length <= currentIndex + 1) {
            throw new MessageError("No more applications found for this user.")
        }

        // Get the application
        const latestApplication = applications[currentIndex + 1]

        const applicationData = latestApplication.data as unknown as ApplicationData

        // Show details of the latest application
        const embed = new EmbedBuilder()
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
            new ButtonBuilder({
                label: "Back",
                style: ButtonStyle.Primary,
                customId: `past-back:${applicationReference}:${currentIndex + 1}`,
                disabled: false
            }),
            new ButtonBuilder({
                label: "Earlier",
                style: ButtonStyle.Primary,
                customId: `past-earlier:${applicationReference}:${currentIndex + 1}`,
                disabled: applications.length <= currentIndex + 2 // Only show next if there is more applications after
            })
        ]

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().setComponents(components)]
        }
        )




    },
};
module.exports = button