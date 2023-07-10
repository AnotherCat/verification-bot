import { ActionRowBuilder } from "@discordjs/builders";
import { Prisma, VerificationSubmission } from "@prisma/client";
import {
    ButtonInteraction,
    MessageActionRow,
    MessageActionRowComponent,
    MessageButton,
    MessageEmbed,
    MessageOptions,
    MessagePayload,
    ModalSubmitInteraction,
    ThreadChannel,
} from "discord.js";
import { prisma } from "..";
import { embedBlue, embedGreen } from "../const";
import { MessageError } from "../errors";
import {
    followupChannel as followupChannelId,
    privateThreads,
    followUpPingRoles,
} from "../settings.json";
import { Modal } from "../types";

const modal: Modal = {
    customIdLabel: "followup",
    async execute(interaction: ModalSubmitInteraction) {
        // defer update
        await interaction.deferUpdate();

        // get applicationId from customId
        const applicationReference = interaction.customId.split(":")[1];

        // check the status of the current user, it must be pending
        const application = await prisma.verificationSubmission.findUnique({
            where: {
                reference: applicationReference,
            },
        });

        if (!application) {
            throw new MessageError("No application found for this user.");
        }

        if (application.status !== "PENDING" && application.status !== "RAISED") {
            throw new MessageError("This application is not pending.");
        }

        const userId = application.userId.toString();

        // Get member
        const member = await interaction.guild.members.fetch(userId);

        // Throw if member is not in the guild
        if (!member) {
            throw new MessageError("User is not in the guild.");
        }

        const messageModalContent = interaction.fields.getTextInputValue(
            "message"
        ) as string | undefined | null;

        // For each new line in message content add a ">  " for markdown quotes

        const messageContent = !!messageModalContent
            ? messageModalContent
                ?.split("\n")
                .map((line) => line.length > 0 ? `>  ${line}` : "")
                .join("\n")
            : undefined;

        let followupInitialContent: MessageOptions = {
            content: `<@${userId}> a follow up has been opened in response to your application, by <@${interaction.user.id
                }>. ${followUpPingRoles.map((roleId) => `<@&${roleId}>`).join(" ")}`,
        };
        let followupInitialReopenContent: MessageOptions = {
            content: `<@${userId}> a follow up has been reopened in response to your most recent application, by <@${interaction.user.id
                }>. ${followUpPingRoles.map((roleId) => `<@&${roleId}>`).join(" ")}`,
        };
        let followupInitialContentSecondMessage: MessageOptions | undefined =
            undefined;
        const applicationMessageJumpLink = `https://discordapp.com/channels/${interaction.guild.id}/${application.reviewMessageChannelId}/${application.reviewMessageId}`;

        const components = [
            new MessageActionRow().addComponents([
                new MessageButton({
                    label: "View Application",
                    url: applicationMessageJumpLink,
                    style: "LINK",
                }),
            ]),
        ];
        if (messageContent) {
            if (
                messageContent.length + followupInitialContent.content.length + 2 >
                2000
            ) {
                followupInitialContentSecondMessage = {
                    content: messageContent,
                    components,
                };

            } else {
                followupInitialContent.content += `\n\n${messageContent}`;
                followupInitialContent.components = components;
                followupInitialReopenContent.content += `\n\n${messageContent}`;
                followupInitialReopenContent.components = components;
            }
        } else {
            followupInitialContent.components = components;
        }

        // get the followup channel

        const followupChannel = await interaction.guild.channels.fetch(
            followupChannelId
        );

        if (followupChannel.type !== "GUILD_TEXT") {
            throw new MessageError("Followup channel is not a text channel.");
        }

        let thread: ThreadChannel;

        // Find any previous followups that have been opened for this user
        // Do this by searching for records for that userId, and where followUpChannelId is not null

        const previousFollowup = await prisma.verificationSubmission.findFirst({
            where: {
                userId: BigInt(userId),
                followUpChannelId: {
                    not: null,
                },
            },
            orderBy: {
                timestamp: "desc",
            },
        });

        const previousFollowupChannelId = previousFollowup?.followUpChannelId.toString();
        if (previousFollowupChannelId) {
            // Find thread
            thread = await followupChannel.threads.fetch(previousFollowupChannelId);
            // If thread is not found, create a new thread
            if (thread) {

                // first check that the bot can manage threads and can send messages in threads
                if (!interaction.guild.me.permissionsIn(followupChannel).has("MANAGE_THREADS") || !interaction.guild.me.permissionsIn(followupChannel).has("SEND_MESSAGES_IN_THREADS")) {
                    throw new MessageError("The bot does not have permissions to manage threads and send messages in them.");
                }
                await thread.send(followupInitialReopenContent);
                if (followupInitialContentSecondMessage) {
                    await thread.send(followupInitialContentSecondMessage);
                }
            }

        }
        if (!thread) {


            if (privateThreads) {
                // create a private thread with the user, but first check if the bot has permission, and the guild can have private threads
                if (
                    !interaction.guild.me
                        .permissionsIn(followupChannel)
                        .has("CREATE_PRIVATE_THREADS") ||
                    !interaction.guild.me
                        .permissionsIn(followupChannel)
                        .has("SEND_MESSAGES_IN_THREADS")
                ) {
                    throw new MessageError(
                        "The bot does not have permission to create private threads and send messages in them."
                    );
                }
                if (
                    interaction.guild.premiumTier === "NONE" ||
                    interaction.guild.premiumTier === "TIER_1"
                ) {
                    throw new MessageError(
                        "The guild does not have the required boost level to create private threads."
                    );
                }
            } else {
                // create public thread with the user, but first check if the bot has the permission to do so

                if (
                    !interaction.guild.me
                        .permissionsIn(followupChannel)
                        .has("CREATE_PUBLIC_THREADS") ||
                    !interaction.guild.me
                        .permissionsIn(followupChannel)
                        .has("SEND_MESSAGES_IN_THREADS")
                ) {
                    throw new MessageError(
                        "The bot does not have permission to create public threads and send messages in them."
                    );
                }
            }



            thread = await followupChannel.threads.create({
                type: privateThreads ? "GUILD_PRIVATE_THREAD" : "GUILD_PUBLIC_THREAD",
                invitable: false,
                name: `Follow up for ${member.user.username}`,
                autoArchiveDuration: "MAX"
            });
            await thread.send(followupInitialContent);
            if (followupInitialContentSecondMessage) {
                await thread.send(followupInitialContentSecondMessage);
            }
        }

        // update the application status to followup
        await prisma.verificationSubmission.update({
            where: {
                reference: applicationReference,
            },
            data: {
                status: "FOLLOWUP",
                followUpChannelId: BigInt(thread.id),
            },
        });

        // Update the message to show it's been followed up

        // Add a note to the end of the embeds description and disable the followup button
        const embed = interaction.message.embeds[0];
        embed.description = `${embed.description}\n\nFollowup has been opened in: <#${thread.id}>`;

        const interactionComponents = interaction.message.components[0]
            .components as MessageActionRowComponent[];
        interactionComponents.forEach((component) => {
            if (
                component.type === "BUTTON" &&
                component.customId.includes("followup")
            ) {
                component.disabled = true;
            }
        });

        await interaction.editReply({
            embeds: [embed],
            components: [new MessageActionRow().addComponents(interactionComponents)],
        });
    },
};

module.exports = modal;
