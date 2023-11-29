import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { ApplicationData, Button } from "../types";
import { checkReviewerRole } from "../helpers/permissions";


const button: Button = {
    customIdLabel: 'past-back',
    async execute(interaction: ButtonInteraction) {
        await checkReviewerRole(interaction)
        await interaction.deferUpdate()
        // First get the applicationId from the customId
        const applicationReference = interaction.customId.split(":")[1]
        const currentIndex = parseInt(interaction.customId.split(":")[2])

        // Check the status of the current user, it must be pending, raised, or followup.
        // This is to ensure that the data is only displayed for current applications
        const application = await prisma.verificationSubmission.findUnique({
            where: {
                reference: applicationReference,
                status: {
                    in: ["PENDING", "RAISED", "FOLLOWUP"]
                }

            }
        })
        console.log(application)
        if (!application) {
            throw new MessageError("No application found for this user.")
        }

        // Get all applications, from latest to oldest, that are complete 
        const applications = await prisma.verificationSubmission.findMany({
            where: {
                userId: application.userId,
                status: {
                    in: ["APPROVED", "DENIED"]
                }
            }, orderBy: { timestamp: "desc" }
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
                label: "Earlier",
                style: ButtonStyle.Primary,
                customId: `past-earlier:${applicationReference}:${currentIndex - 1}`,
                disabled: false
            }),
            new ButtonBuilder({
                label: "Back",
                style: ButtonStyle.Primary,
                customId: `past-back:${applicationReference}:${currentIndex - 1}`,
                disabled: currentIndex - 1 <= 0
            }),
        ]

        await interaction.editReply({
            embeds: [embed],
            components: [new ActionRowBuilder<ButtonBuilder>().setComponents(components)]
        }
        )




    },
};
module.exports = button