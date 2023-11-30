import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder } from "discord.js";
import { checkReviewerRole } from "../helpers/permissions";
import { prisma } from "..";
import { MessageError } from "../errors";
import { Prisma } from "@prisma/client"
import { ApplicationData } from "../types";
import { embedGreen } from "../const";

async function sharedLogic(interaction: ButtonInteraction): Promise<{
    embeds: EmbedBuilder[],
    components: ActionRowBuilder<ButtonBuilder>[]
}> {
    await checkReviewerRole(interaction)
    const applicationReference = interaction.customId.split(":")[1]
    const targetIndex = parseInt(interaction.customId.split(":")[2])

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
    if (!application) {
        throw new MessageError("No application found for this user.")
    }

    // Get the number of completed applications
    const count = await prisma.verificationSubmission.count({
        where: {
            userId: application.userId,
            status: {
                in: ["APPROVED", "DENIED"]
            }
        }
    })

    // If there are none, throw error
    if (count === 0) {
        throw new MessageError("No historical applications found for this user.")
    }

    // Check if the target index in in range
    if (targetIndex < 0 || targetIndex >= count) {
        // TODO: Better error
        throw new MessageError("Invalid index.")
    }

    // Next get application at index
    let targetApplication: Prisma.VerificationSubmissionGetPayload<true>

    try {
        targetApplication = await prisma.verificationSubmission.findFirstOrThrow({
            where: {
                userId: application.userId,
                status: {
                    in: ["APPROVED", "DENIED"]
                }
            }, orderBy: { timestamp: "desc" }, skip: targetIndex
        })
    }
    catch (error) {
        // If error is prisma error, throw better error
        if (error.code === "P2025") {
            throw new MessageError("No more applications found for this user at that index.")
        } else {
            throw error
        }
    }

    const applicationData = targetApplication.data as unknown as ApplicationData

    // Show details of the latest application
    const embed = new EmbedBuilder()
        .setTitle("Past application details")
        .setColor(embedGreen)
        .setDescription(
            `**User:** <@${targetApplication.userId}>\n` +
            `**Status:** ${targetApplication.status}\n` +
            `\n__**Application**__:\n**Age**: ${applicationData.age}`
            + `\n**Pronouns**: ${applicationData.pronouns}`
            + `\n**Identity**: ${applicationData.identity}`
            + `\n**Reason**: ${applicationData.reason}`
            + `\n\n**Date Submitted**: <t:${Math.round(targetApplication.timestamp.getTime() / 1000)}:F>`
            + `\n*Application #${targetIndex + 1} of ${count}*`
        )

    const components = [
        new ButtonBuilder({
            label: "Earlier",
            style: ButtonStyle.Primary,
            customId: `past:${applicationReference}:${targetIndex + 1}`,
            disabled: targetIndex + 1 >= count // Only show next if there is more than one application
        }),
        new ButtonBuilder({
            label: "Back",
            style: ButtonStyle.Primary,
            customId: `past:${applicationReference}:${targetIndex - 1}`,
            disabled: targetIndex - 1 < 0
        }),
    ]

    return {
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().setComponents(components)]
    }






}



export default sharedLogic