
import {
    ActionRowBuilder,
    ActionRowComponent,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType,
    BaseMessageOptions,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    ThreadAutoArchiveDuration,
    ThreadChannel,
    EmbedBuilder,
} from "discord.js";
import { prisma } from "..";
import { MessageError } from "../errors";
import {
    followupChannel as followupChannelId,

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

        const messageContent = messageModalContent
            ? messageModalContent
                ?.split("\n")
                .map((line) => line.length > 0 ? `>  ${line}` : "")
                .join("\n")
            : undefined;

        const followupInitialContent: BaseMessageOptions = {
            content: `<@${userId}> a follow up has been opened in response to your application, by <@${interaction.user.id
                }>. ${followUpPingRoles.map((roleId) => `<@&${roleId}>`).join(" ")}`,
        };
        const followupInitialReopenContent: BaseMessageOptions = {
            content: `<@${userId}> a follow up has been reopened in response to your most recent application, by <@${interaction.user.id
                }>. ${followUpPingRoles.map((roleId) => `<@&${roleId}>`).join(" ")}`,
        };
        let followupInitialContentSecondMessage: BaseMessageOptions | undefined =
            undefined;
        const applicationMessageJumpLink = `https://discordapp.com/channels/${interaction.guild.id}/${application.reviewMessageChannelId}/${application.reviewMessageId}`;

        const components = [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder({
                    label: "View Application",
                    url: applicationMessageJumpLink,
                    style: ButtonStyle.Link,
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

        if (followupChannel.type !== ChannelType.GuildText) {
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
                if (!interaction.guild.members.me.permissionsIn(followupChannel).has(PermissionFlagsBits.ManageThreads) || !interaction.guild.members.me.permissionsIn(followupChannel).has(PermissionFlagsBits.SendMessagesInThreads)) {
                    throw new MessageError("The bot does not have permissions to manage threads and send messages in them.");
                }
                await thread.send(followupInitialReopenContent);
                if (followupInitialContentSecondMessage) {
                    await thread.send(followupInitialContentSecondMessage);
                }
            }

        }
        if (!thread) {


            // create a private thread with the user, but first check if the bot has permission
            if (
                !interaction.guild.members.me
                    .permissionsIn(followupChannel)
                    .has(PermissionFlagsBits.CreatePrivateThreads) ||
                !interaction.guild.members.me
                    .permissionsIn(followupChannel)
                    .has(PermissionFlagsBits.SendMessagesInThreads) ||
                !interaction.guild.members.me
                    .permissionsIn(followupChannel)
                    .has(PermissionFlagsBits.ViewChannel)
            ) {
                throw new MessageError(
                    "The bot does not have permission to create private threads and send messages in them."
                );
            }



            thread = await followupChannel.threads.create({
                type: ChannelType.PrivateThread,
                invitable: false,
                name: `Follow up for ${member.user.username}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
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
        const embed = EmbedBuilder.from(interaction.message.embeds[0])

        embed.setDescription(`${embed.data.description}\n\nFollowup has been opened in: <#${thread.id}>`)

        const interactionComponents = interaction.message.components[0]
            .components as ActionRowComponent[]
        const newInteractionComponents = new ActionRowBuilder<ButtonBuilder>()
        interactionComponents.forEach((component) => {
            if (
                component.type === ComponentType.Button) {
                if (
                    component.customId.includes("followup")) {


                    const newComponent = ButtonBuilder.from(component);
                    newComponent.setDisabled(true);
                    newInteractionComponents.addComponents(newComponent);
                }
                else { newInteractionComponents.addComponents(ButtonBuilder.from(component)); }
            }
        }
        );



        await interaction.editReply({
            embeds: [embed],
            components: [newInteractionComponents],
        });
    },
};

module.exports = modal;
