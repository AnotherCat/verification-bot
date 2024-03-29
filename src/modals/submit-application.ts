import { Prisma, VerificationSubmission } from "@prisma/client";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { prisma } from "..";
import { embedBlue, embedGreen } from "../const";
import { MessageError } from "../errors";
import { ApplicationData, Modal } from "../types";
import crypto from "crypto";
import sharedRaise from "../shared/raise";


const modal: Modal<true> = {
    customIdLabel: 'submit-application',
    settingsRequired: true,
    async execute(interaction, settings) {

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
            orderBy: { creationTimestamp: "asc" }, // So that zero is the most recent
        })
        const mostRecentApplication = pastApplications[0] as VerificationSubmission | undefined

        if (mostRecentApplication && (mostRecentApplication.status === "PENDING" || mostRecentApplication.status === "RAISED" || mostRecentApplication.status === "FOLLOWUP")) {
            throw new MessageError("You already have a pending application, please wait for that to be reviewed.")
        }

        const application: ApplicationData = {
            pronouns: interaction.fields.getTextInputValue("pronouns"),
            age: interaction.fields.getTextInputValue("age"),
            sexuality: interaction.fields.getTextInputValue("sexuality"),
            gender: interaction.fields.getTextInputValue("gender"),
            reason: interaction.fields.getTextInputValue("reason"),
        }
        console.log(application)

        const applicationReference = crypto.randomUUID()

        // send application to review channel
        const reviewChannel = interaction.guild.channels.cache.get(settings.reviewChannelId);
        if (!reviewChannel || !reviewChannel.isTextBased()) {
            throw new Error("Could not find the review channel! This is not an expected error, please contact a server mod.");
        }
        console.log(`Application submitted by: <@${interaction.member.user.id}> \`${interaction.member.user.username}#${interaction.member.user.discriminator}\` (\`${interaction.member.user.id}\`)` +
            `\n\n**Age**: ${application.age}`
            + `\n**Pronouns**: ${application.pronouns}`
            + `${application.identity ? `\n**Identity**: ${application.identity}` : ""}${application.sexuality ? `\n**Sexuality**: ${application.sexuality}` : ""}${application.gender ? `\n**Gender**: ${application.gender}` : ""}`
            + `\n**Reason**: ${application.reason}`,)
        const reviewMessage = await reviewChannel.send({
            embeds: [
                new EmbedBuilder({
                    title: `Reviewing ${interaction.member.user.username}'s application`,
                    description: `Application submitted by: <@${interaction.member.user.id}> \`${interaction.member.user.username}#${interaction.member.user.discriminator}\` (\`${interaction.member.user.id}\`)` +
                        `\n\n**Age**: ${application.age}`
                        + `\n**Pronouns**: ${application.pronouns}`
                        + `${application.identity ? `\n**Identity**: ${application.identity}` : ""}${application.sexuality ? `\n**Sexuality**: ${application.sexuality}` : ""}${application.gender ? `\n**Gender**: ${application.gender}` : ""}`
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
                            .setCustomId(`view-past:${applicationReference}:0`)
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
                creationTimestamp: new Date(),
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
                    description: `Your application will now be manually reviewed. \n*You may dismiss this message.* `
                    , color: embedGreen
                })
            ],
            content: undefined,
            components: []
        })

        // Check if user is underage
        if (Number(application.age) < 13) {
            const raiseData = await sharedRaise({
                applicationReference,
                guild: interaction.guild,
                reason: `User is underage (<13)`,
                settings,
                raiseMember: interaction.guild.members.me ?? await interaction.guild.members.fetchMe()
                , message: reviewMessage
            })

            await reviewMessage.edit({
                embeds: [
                    raiseData.embed
                ],
                components: raiseData.originalMessageComponents
            })



        }




    },
};
module.exports = modal