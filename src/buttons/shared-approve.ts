import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ThreadChannel, PermissionFlagsBits, ChannelType, ButtonStyle, ComponentType, APIEmbed, GuildMember } from "discord.js"
import { prisma } from ".."
import { embedGreen } from "../const"
import { MessageError } from "../errors"
import { ApplicationData, GuildSettingsParsed } from "../types"

const approveLogic = async ({
    interaction, settings

}: { interaction: ButtonInteraction<"cached">, settings: GuildSettingsParsed }) => {

    let me: GuildMember | null = interaction.guild.members.me
    if (!me) {
        me = await interaction.guild.members.fetchMe()
        interaction.guild.members.me
    }
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
    if (application.status !== "PENDING" && application.status !== "FOLLOWUP" && application.status !== "RAISED") {
        throw new MessageError("This application is not pending.")
    }

    const userId = application.userId.toString()

    const applicationData = application.data as unknown as ApplicationData



    const member = await interaction.guild.members.fetch(userId)

    const logChannel = await interaction.guild.channels.fetch(settings.logChannelId)
    if (!logChannel || !logChannel.isTextBased() || logChannel.isDMBased()) {
        throw new MessageError("Approve log channel is not a text channel.")
    }
    if (!logChannel.permissionsFor(me).has(PermissionFlagsBits.SendMessages) || !logChannel.permissionsFor(me).has(PermissionFlagsBits.ViewChannel)) {
        throw new MessageError("I do not have the required permissions to send messages to the approve log channel.")
    }

    const logEmbed = new EmbedBuilder({
        title: `Application by ${member.user.username} approved`,
        description: `Application submitted by: <@${member.user.id}> \`${member.user.username}#${member.user.discriminator}\` (\`${member.user.id}\`)` +
            `\n\n**Age**: ${applicationData.age}`
            + `\n**Pronouns**: ${applicationData.pronouns}`
            + `\n**Identity**: ${applicationData.identity}`
            + `\n**Reason**: ${applicationData.reason}`,
        color: embedGreen
    })
    const logActionRow = new ActionRowBuilder<ButtonBuilder>()






    // Throw if member is not in the guild
    if (!member) {
        throw new MessageError("User is not in the guild.")
    }
    // Update the user's roles
    // first check if the bot has the permissions to do so, and has the right role permissions 
    if (
        !me.permissions.has(PermissionFlagsBits.ManageRoles) ||
        (settings.addRoleId !== null && me.roles.highest.comparePositionTo(settings.addRoleId) <= 0) ||
        (settings.removeRoleId !== null && me.roles.highest.comparePositionTo(settings.removeRoleId) <= 0) ||
        !member.manageable
    ) {
        throw new MessageError("I do not have the required permissions to add or remove the roles for that user.")
    }
    if (settings.addRoleId) {
        await (member).roles.add(settings.addRoleId)
    }
    if (settings.removeRoleId) {
        await member.roles.remove(settings.removeRoleId)
    }


    // Update the status to approved
    await prisma.verificationSubmission.update({
        where: {
            reference: application.reference,
        },
        data: {
            status: "APPROVED",
            reviewMessageDeleted: true
        }
    })

    // send success message
    // get channel
    const channel = await interaction.guild.channels.fetch(settings.successMessageChannelId)
    // send message
    if (channel && channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages) && channel.isTextBased()) {
        await channel.send(settings.successMessage.replace("{user}", `<@${userId}>`))
    }




    let followupThread: ThreadChannel | undefined
    if (application.followUpChannelId) {
        const followUpParentChannel = await interaction.guild.channels.fetch(settings.followUpChannelId)
        if (followUpParentChannel && followUpParentChannel.type === ChannelType.GuildText) {
            const thread = await followUpParentChannel.threads.fetch(application.followUpChannelId.toString(),)
            if (thread) {
                followupThread = thread
                logActionRow.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${interaction.guild.id}/${thread.id}/${thread.lastMessageId}`).setLabel("View followup thread"))
            }
        }
    }

    let raiseThread: ThreadChannel | undefined
    if (application.raiseThreadId) {
        const raiseParentChannel = await interaction.guild.channels.fetch(settings.raiseChannelId)
        if (raiseParentChannel && raiseParentChannel.type === ChannelType.GuildText) {
            const thread = await raiseParentChannel.threads.fetch(application.raiseThreadId.toString(),)
            if (thread) {
                raiseThread = thread
                logActionRow.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${interaction.guild.id}/${thread.id}/${thread.lastMessageId}`).setLabel("View raise thread"))
            }
        }
    }



    // Now send log message
    const logMessage = await logChannel.send({ embeds: [logEmbed], components: logActionRow.components.length > 0 ? [logActionRow] : [] })








    // Close and lock the followup thread 
    if (followupThread) {
        await followupThread.send({ content: `The user has been approved - this thread should now be closed. [Click here](${logMessage.url}) for log message`, })
        // Check if bot has MANAGE_THREADS permission
        if (followupThread && followupThread.permissionsFor(me).has(PermissionFlagsBits.ManageThreads)) {

            await followupThread.edit({
                locked: true,
                archived: true,
                reason: "Application approved"
            })
        }

    }



    // Close and lock the raise thread
    if (raiseThread) {
        await raiseThread.send({ content: `The user has been approved - this thread should now be closed. [Click here](${logMessage.url}) for log message`, })
        // Check if bot has MANAGE_THREADS permission
        if (raiseThread && raiseThread.permissionsFor(me).has(PermissionFlagsBits.ManageThreads)) {
            await raiseThread.edit({
                locked: true,
                archived: true,
                reason: "Application approved"
            })
        }


    }


    // Remove the application message
    const reviewChannel = await interaction.guild.channels.fetch(settings.reviewChannelId)
    if (!reviewChannel || reviewChannel.type !== ChannelType.GuildText) {
        throw new MessageError("Review channel is not a text channel.")
    }
    await (await reviewChannel.messages.fetch(application.reviewMessageId.toString())).delete()

    // Update the interaction's message
    interaction.editReply({
        embeds: [
            new EmbedBuilder(interaction.message.embeds[0] as APIEmbed).setDescription(interaction.message.embeds[0].description + "\n\n" + "The user has been approved.").setColor(embedGreen)
        ],
        components: [new ActionRowBuilder<ButtonBuilder>().setComponents(interaction.message.components[0].components?.map(receivedComponent => {
            if (receivedComponent.type === ComponentType.Button) {
                const component = ButtonBuilder.from(receivedComponent)
                component.setDisabled(true)
                return component
            }
        }).filter((item) => item !== undefined) as ButtonBuilder[] || [])]
    })


}
export default approveLogic