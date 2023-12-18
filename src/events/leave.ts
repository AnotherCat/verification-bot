import { ActionRowBuilder, AuditLogEvent, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, Guild, GuildMember, PartialGuildMember, PermissionFlagsBits, SnowflakeUtil, ThreadChannel, User } from "discord.js";
import { prisma } from "..";
import { ApplicationData } from "../types";
import { followupChannel as followUpChannelId, approveLogChannel, raiseChannel, reviewChannel as reviewChannelId } from "../settings.json"

import { MessageError } from "../errors";
import { embedOrange, embedRed, embedYellow } from "../const";
import { VerificationSubmission } from "@prisma/client";


// TODO: no check for audit logs

type LeaveType = "ban" | "kick" | "leave";

export async function onLeave(member: GuildMember | PartialGuildMember) {

    console.log("SOMEONE LEFT")
    // fetch audit logs to see if leave, kick or ban (after is a snowflake)
    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 40,
        after: SnowflakeUtil.generate({ timestamp: Date.now() - 1000 * 45 }).toString(),
    })
    // filter logs by the user & if it was recent (last 10m)
    const logs = fetchedLogs.entries.filter(entry => entry.target.id === member.user.id)
    // loop through and use the first kick or ban
    let type: LeaveType = "leave"
    let reason = ""
    console.log(logs)
    for (const log of logs.values()) {
        if (log.action === AuditLogEvent.MemberBanAdd) {
            type = "ban"
            reason = log.reason ? `User Banned with reason: ${reason}` : ""
            break
        }
        if (log.action === AuditLogEvent.MemberKick) {
            type = "kick"

            reason = log.reason ? `User Kicked with reason ${reason}` : ""
            break
        }
    }
    if (!reason) {

        reason = logs.values()[0]?.reason ?? ""
    }

    const applications = await prisma.verificationSubmission.findMany({
        where: {
            userId: BigInt(member.user.id),
            status: {
                in: ["PENDING", "RAISED", "FOLLOWUP"]
            }

        },
    })
    for (const application of applications) {
        await closeApplication({ application, type, guild: member.guild, user: member.user, reason })
    }

}


async function closeApplication({ application, guild, reason, type, user }: { application: VerificationSubmission, guild: Guild, user: User, type: LeaveType, reason: string }) {
    // red: ban, orange: kick, yellow: leave
    const embedColor = type === "ban" ? embedRed : type === "kick" ? embedOrange : embedYellow;
    const applicationData = application.data as unknown as ApplicationData
    const logChannel = await guild.channels.fetch(approveLogChannel)
    if (!logChannel || !logChannel.isTextBased() || logChannel.isDMBased()) {
        throw new Error("Approve log channel is not a text channel.")
    }
    if (!logChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages) || !logChannel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ViewChannel)) {
        throw new Error("I do not have the required permissions to send messages to the approve log channel.")
    }
    const logEmbed = new EmbedBuilder({
        title: `Application by ${user.globalName} ` + (type === "ban" ? "was denied as user was banned" : type === "kick" ? "denied as user was kicked" : "lapsed as user left the server"),
        description: `Application submitted by: <@${user.id}> \`${user.username}#${user.discriminator}\` (\`${user.id}\`)` +
            `\n\n**Age**: ${applicationData.age}`
            + `\n**Pronouns**: ${applicationData.pronouns}`
            + `\n**Identity**: ${applicationData.identity}`
            + `\n**Reason**: ${applicationData.reason}`
            + (reason ? `\n\n**${type.charAt(0).toUpperCase() + type.slice(1)} Reason**: ${reason}` : ""),
        color: embedColor
    })
    console.log(logEmbed);
    const logActionRow = new ActionRowBuilder<ButtonBuilder>()

    // Update the status to denied
    await prisma.verificationSubmission.update({
        where: {
            reference: application.reference,
        },
        data: {
            status: type === "ban" ? "BANNED" : type === "kick" ? "DENIED" : "LAPSED",
            reviewMessageDeleted: true
        }
    })

    let followupThread: ThreadChannel | undefined
    if (application.followUpChannelId) {
        const followUpParentChannel = await guild.channels.fetch(followUpChannelId)
        if (followUpParentChannel && followUpParentChannel.type === ChannelType.GuildText) {
            const thread = await followUpParentChannel.threads.fetch(application.followUpChannelId.toString(),)
            if (thread) {
                followupThread = thread
                logActionRow.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${thread.id}/${thread.lastMessageId}`).setLabel("View followup thread"))
            }
        }
    }

    let raiseThread: ThreadChannel | undefined
    if (application.raiseThreadId) {
        const raiseParentChannel = await guild.channels.fetch(raiseChannel)
        if (raiseParentChannel && raiseParentChannel.type === ChannelType.GuildText) {
            const thread = await raiseParentChannel.threads.fetch(application.raiseThreadId.toString(),)
            if (thread) {
                raiseThread = thread
                logActionRow.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${thread.id}/${thread.lastMessageId}`).setLabel("View raise thread"))
            }
        }
    }

    // Now send log message
    const logMessage = await logChannel.send({ embeds: [logEmbed], components: logActionRow.components.length > 0 ? [logActionRow] : [] })

    // Close and lock the followup thread 
    // TODO: Also disable buttons
    if (followupThread) {
        await followupThread.send({ content: `The user has ${type === "ban" ? "been denied (banned))" : type === "kick" ? "been denied (kicked)" : "left the server"} - this thread should now be closed. [Click here](${logMessage.url}) for log message`, })
        // Check if bot has MANAGE_THREADS permission
        if (followupThread && followupThread.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageThreads)) {

            await followupThread.edit({
                locked: true,
                archived: true,
                reason: `Application ${type === "ban" ? "denied (banned)" : type === "kick" ? "denied (kicked)" : "lapsed"}`
            })
        }

    }

    // Close and lock the raise thread
    if (raiseThread) {
        await raiseThread.send({ content: `The user has ${type === "ban" ? "been denied (banned))" : type === "kick" ? "been denied (kicked)" : "left the server"} - this thread should now be closed. [Click here](${logMessage.url}) for log message`, })
        // Edit raise message 
        await raiseThread.messages.fetch(application.raiseMessageId.toString()).then(async (message) => {
            await message.edit({
                embeds: [
                    new EmbedBuilder(message.embeds[0]).setDescription(message.embeds[0].description + "\n\n" + `The user has ${type === "ban" ? "been denied (banned))" : type === "kick" ? "been denied (kicked)" : "left the server"}`).setColor(embedColor)
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().setComponents(message.components[0].components?.map(receivedComponent => {
                    if (receivedComponent.type === ComponentType.Button) {
                        const component = ButtonBuilder.from(receivedComponent)
                        component.setDisabled(true)
                        return component
                    }
                }))]
            })
        })
        // Check if bot has MANAGE_THREADS permission

        if (raiseThread && raiseThread.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageThreads)) {
            await raiseThread.edit({
                locked: true,
                archived: true,
                reason: `Application ${type === "ban" ? "denied (banned)" : type === "kick" ? "denied (kicked)" : "lapsed"}`
            })
        }


    }

    // Remove the application message
    const reviewChannel = await guild.channels.fetch(reviewChannelId)
    if (reviewChannel.type !== ChannelType.GuildText) {
        throw new MessageError("Review channel is not a text channel.")
    }
    await (await reviewChannel.messages.fetch(application.reviewMessageId.toString())).delete()
}