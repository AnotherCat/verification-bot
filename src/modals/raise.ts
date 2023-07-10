
import {
    MessageActionRow,
    MessageActionRowComponent,
    MessageButton,
    MessageEmbed,
    MessageOptions,
    MessagePayload,
    ModalSubmitInteraction,
    TextChannel,
    ThreadChannel,
} from "discord.js";
import { prisma } from "..";
import { embedBlue, embedGreen, embedRed } from "../const";
import { MessageError } from "../errors";
import {

    raiseChannel as raiseChannelId,
    raiseRole
} from "../settings.json";
import { ApplicationData, Modal } from "../types";

const modal: Modal = {
    customIdLabel: "raise",
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

        if (application.status !== "PENDING" && application.status !== "FOLLOWUP") {
            throw new MessageError("This application is not pending.");
        }

        const userId = application.userId.toString();

        const pastApplications = await prisma.verificationSubmission.findMany({
            where: {
                userId: BigInt(userId),
            },
            orderBy: { timestamp: "asc" }, // So that zero is the most recent
        })

        // Get member
        const member = await interaction.guild.members.fetch(userId);

        // Throw if member is not in the guild
        if (!member) {
            throw new MessageError("User is not in the guild.");
        }

        const reason = interaction.fields.getTextInputValue(
            "reason"
        )
            ;
        const raiseChannel = await interaction.guild.channels.fetch(raiseChannelId);

        if (raiseChannel.type !== "GUILD_TEXT") {
            throw new MessageError("Raise channel is not a text channel.");
        }

        const applicationData = application.data as unknown as ApplicationData


        const components =
            [new MessageButton()
                .setLabel("Override & Approve")
                .setCustomId(`raise-approve:${applicationReference}`)
                .setStyle("SUCCESS"),


            // If past applications exist, show a button to view them
            ...(pastApplications.length > 0 ? [
                new MessageButton()
                    .setLabel("View Previous")
                    .setCustomId(`view-past:${applicationReference}`)
                    .setStyle("PRIMARY"),
            ] : []),]

        let followUpMention = ""
        if (!application.followUpChannelId) {
            components.push(new MessageButton()
                .setLabel("Open Follow-up")
                .setCustomId(`raise-followup:${applicationReference}`)
                .setStyle("PRIMARY"))
        } else {
            followUpMention = `\n\nA followup has been opened in: <#${application.followUpChannelId}>`
        }



        const raiseReport = await raiseChannel.send({
            embeds: [new MessageEmbed({
                title: `Reviewing ${member.user.username}'s application - raised by ${interaction.member.user.username}`,
                description: `Original Application submitted by: <@${member.user.id}> \`${member.user.username}#${member.user.discriminator}\` (\`${member.user.id}\`)` +
                    `\n\n**Age**: ${applicationData.age}`
                    + `\n**Pronouns**: ${applicationData.pronouns}`
                    + `\n**Identity**: ${applicationData.identity}`
                    + `\n**Reason**: ${applicationData.reason}`
                    + `\n\n**Raised by**: <@${interaction.member.user.id}>`
                    + `\n**Raise reason**: ${reason}` + followUpMention,
                color: embedRed
            })],
            components: [
                new MessageActionRow().setComponents(
                    components
                )
            ]
        })

        // If the bot has the correct permissions create a public thread on that message
        const permissionsInRaiseChannel = interaction.guild.me.permissionsIn(raiseReport.channel as TextChannel)
        if (!(permissionsInRaiseChannel.has("CREATE_PUBLIC_THREADS") && permissionsInRaiseChannel.has("SEND_MESSAGES_IN_THREADS"))) {
            throw new MessageError("The bot does not have the correct permissions to create a public thread in the raise channel.");
        }
        const thread = await raiseReport.startThread({ name: `Report of ${member.user.username}`, reason: "Raise report", autoArchiveDuration: "MAX" });
        // send message pinging
        await thread.send({ content: `<@${interaction.member.user.id}> raised an application by <@${member.user.id}>. <@&${raiseRole}>` })


        // update the application to be raised
        await prisma.verificationSubmission.update({
            where: {
                reference: applicationReference,
            }
            , data: {
                status: "RAISED",
                raiseMessageId: BigInt(raiseReport.id),
                raiseThreadId: BigInt(thread.id),
            }
        })

        // update the 

        // Update the message to show it's been raised

        // Add a note to the end of the embeds description and disable all buttons
        const embed = interaction.message.embeds[0];
        embed.description = `${embed.description}\n\nApplication has been raised. See the report in <#${thread.id}> for more info`;
        embed.color = embedRed

        const interactionComponents = interaction.message.components[0]
            .components as MessageActionRowComponent[];
        interactionComponents.forEach((component) => {
            if (
                component.type === "BUTTON"
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
