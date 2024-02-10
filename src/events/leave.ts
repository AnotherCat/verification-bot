import { APIEmbed, ActionRowBuilder, AuditLogEvent, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, Guild, GuildMember, PartialGuildMember, PermissionFlagsBits, SnowflakeUtil, ThreadChannel, User } from "discord.js";
import { prisma } from "..";
import { ApplicationData, GuildSettingsParsed } from "../types";

import { MessageError } from "../errors";
import { embedOrange, embedRed, embedYellow } from "../const";
import { VerificationSubmission } from "@prisma/client";


// TODO: no check for audit logs

type LeaveType = "ban" | "kick" | "leave";

export async function onLeave(member: GuildMember | PartialGuildMember, settings: GuildSettingsParsed) {


    // fetch audit logs to see if leave, kick or ban (after is a snowflake)
    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 40,
        after: SnowflakeUtil.generate({ timestamp: Date.now() - 1000 * 45 }).toString(),
    })
    // filter logs by the user & if it was recent (last 10m)
    const logs = fetchedLogs.entries.filter(entry => entry.targetId === member.user.id)
    // loop through and use the first kick or ban
    let type: LeaveType = "leave"
    let reason = ""
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
        await closeApplication({ application, type, guild: member.guild, user: member.user, reason, settings })
    }

}


async function closeApplication({ application, guild, reason, type, user, settings }: { application: VerificationSubmission, guild: Guild, user: User, type: LeaveType, reason: string, settings: GuildSettingsParsed }) {
    // red: ban, orange: kick, yellow: leave
    const embedColor = type === "ban" ? embedRed : type === "kick" ? embedOrange : embedYellow;
    const applicationData = application.data as unknown as ApplicationData
    const logChannel = await guild.channels.fetch(settings.logChannelId)

    if (!guild.members.me) {
        throw new Error("Bot is not in guild.")
    }

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
            + `${applicationData.identity ? `\n**Identity**: ${applicationData.identity}` : ""}${applicationData.sexuality ? `\n**Sexuality**: ${applicationData.sexuality}` : ""}${applicationData.gender ? `\n**Gender**: ${applicationData.gender}` : ""}`
            + `\n**Reason**: ${applicationData.reason}`
            + (reason ? `\n\n**${type.charAt(0).toUpperCase() + type.slice(1)} Reason**: ${reason}` : ""),
        color: embedColor
    })
    const logActionRow = new ActionRowBuilder<ButtonBuilder>()

    // Update the status to denied
    await prisma.verificationSubmission.update({
        where: {
            reference: application.reference,
        },
        data: {
            status: type === "ban" ? "BANNED" : type === "kick" ? "DENIED" : "LAPSED",
            reviewMessageDeleted: true,
            closureTimestamp: new Date()
        }
    })

    let followupThread: ThreadChannel | undefined
    if (application.followUpChannelId) {
        const followUpParentChannel = await guild.channels.fetch(settings.followUpChannelId)
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
        const raiseParentChannel = await guild.channels.fetch(settings.raiseChannelId)
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
        if (application.raiseMessageId !== null) {
            await raiseThread.messages.fetch(application.raiseMessageId.toString()).then(async (message) => {
                await message.edit({
                    embeds: [
                        new EmbedBuilder(message.embeds[0] as APIEmbed).setDescription(message.embeds[0].description + "\n\n" + `The user has ${type === "ban" ? "been denied (banned))" : type === "kick" ? "been denied (kicked)" : "left the server"}`).setColor(embedColor)
                    ],
                    components: [new ActionRowBuilder<ButtonBuilder>().setComponents(message.components[0].components?.map(receivedComponent => {
                        if (receivedComponent.type === ComponentType.Button) {
                            const component = ButtonBuilder.from(receivedComponent)
                            component.setDisabled(true)
                            return component
                        }
                    }).filter((component): component is ButtonBuilder => Boolean(component)) ?? [])]
                })
            })
        }
        // Check if bot has MANAGE_THREADS permission

        if (raiseThread.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageThreads)) {
            await raiseThread.edit({
                locked: true,
                archived: true,
                reason: `Application ${type === "ban" ? "denied (banned)" : type === "kick" ? "denied (kicked)" : "lapsed"}`
            })
        }


    }

    // Remove the application message
    const reviewChannel = await guild.channels.fetch(settings.reviewChannelId)
    if (!reviewChannel || reviewChannel.type !== ChannelType.GuildText) {
        throw new MessageError("Review channel is not a text channel.")
    }
    await (await reviewChannel.messages.fetch(application.reviewMessageId.toString())).delete()
}