import { Prisma, VerificationSubmission } from "@prisma/client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { prisma } from "..";
import { embedBlue, embedGreen } from "../const";
import { MessageError } from "../errors";
import { reviewChannel as reviewChannelId } from "../settings.json"
import { ApplicationData, Modal } from "../types";
import crypto from "crypto";


const modal: Modal = {
    customIdLabel: 'submit-application',
    async execute(interaction: ModalSubmitInteraction) {
        // Reply with an ephemeral defer
        // Then send the application to the review channel
        // Then store the application in the database
        // Then update the interaction reply with a confirmation for the user
        await interaction.deferUpdate()

        // Check if the current user has a pending or raised application 
        const pastApplications = await prisma.verificationSubmission.findMany({
            where: {
                userId: BigInt(interaction.member.user.id),
            },
            orderBy: { timestamp: "asc" }, // So that zero is the most recent
        })
        const mostRecentApplication = pastApplications[0] as VerificationSubmission | undefined

        if (mostRecentApplication && (mostRecentApplication.status === "PENDING" || mostRecentApplication.status === "RAISED" || mostRecentApplication.status === "FOLLOWUP")) {
            throw new MessageError("You already have a pending application, please wait for that to be reviewed.")
        }

        const application: ApplicationData = {
            pronouns: interaction.fields.getTextInputValue("pronouns"),
            age: interaction.fields.getTextInputValue("age"),
            identity: interaction.fields.getTextInputValue("identity"),
            reason: interaction.fields.getTextInputValue("reason"),
        }

        const applicationReference = crypto.randomUUID()



        // send application to review channel
        const reviewChannel = interaction.guild.channels.cache.get(reviewChannelId)
        if (!reviewChannel || !reviewChannel.isTextBased()) {
            throw new Error("Could not find the review channel! This is not an expected error, please contact a server mod.")
        }
        const reviewMessage = await reviewChannel.send({
            embeds: [
                new EmbedBuilder({
                    title: `Reviewing ${interaction.member.user.username}'s application`,
                    description: `Application submitted by: <@${interaction.member.user.id}> \`${interaction.member.user.username}#${interaction.member.user.discriminator}\` (\`${interaction.member.user.id}\`)` +
                        `\n\n**Age**: ${application.age}`
                        + `\n**Pronouns**: ${application.pronouns}`
                        + `\n**Identity**: ${application.identity}`
                        + `\n**Reason**: ${application.reason}`,
                    color: embedBlue
                })
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setLabel("Approve")
                        .setCustomId(`approve:${applicationReference}`)
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel("Open Follow-up")
                        .setCustomId(`followup:${applicationReference}`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setLabel("Raise")
                        .setCustomId(`raise:${applicationReference}`)
                        .setStyle(ButtonStyle.Danger),
                    // If past applications exist, show a button to view them
                    ...(pastApplications.length > 0 ? [
                        new ButtonBuilder()
                            .setLabel("View Previous")
                            .setCustomId(`view-past:${applicationReference}`)
                            .setStyle(ButtonStyle.Primary),
                    ] : []),
                )
            ]
        })

        // Save application 
        await prisma.verificationSubmission.create({
            data: {
                reference: applicationReference,
                userId: BigInt(interaction.member.user.id),
                data: application as unknown as Prisma.JsonObject,
                timestamp: new Date(),
                status: "PENDING",
                guild: {
                    connectOrCreate: {

                        where: { id: BigInt(interaction.guild.id), },
                        create: {
                            id: BigInt(interaction.guild.id),
                        }
                    }
                },
                reviewMessageId: BigInt(reviewMessage.id),
                reviewMessageChannelId: BigInt(reviewMessage.channel.id),

            }

        })



        // Send success message
        await interaction.editReply({
            embeds: [
                new EmbedBuilder({
                    title: "Application Submitted",
                    description: `Application successfully! Your application will now be manually reviewed.`
                    , color: embedGreen
                })
            ],
            content: undefined,
            components: []
        })


    },
};
module.exports = modal