
import { GuildSettingsParsed } from "../types";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType, Guild,
    EmbedBuilder,
    PermissionFlagsBits,
    ThreadAutoArchiveDuration,
    GuildMember,
    Message,
} from "discord.js";
import { prisma } from "..";
import { embedRed } from "../const";
import { MessageError } from "../errors";

import { ApplicationData } from "../types";

export default async function sharedRaise(
    {
        applicationReference,
        guild,
        reason,
        settings,
        raiseMember,
        message

    }: {
        applicationReference: string
        guild: Guild
        reason: string
        settings: GuildSettingsParsed
        raiseMember: GuildMember
        message: Message
    }) {



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

    const pastApplications = await prisma.verificationSubmission.count({
        where: {
            userId: BigInt(userId),
            status: {
                in: ["APPROVED", "DENIED", "BANNED", "LAPSED"]
            },
        },
        orderBy: { creationTimestamp: "asc" }, // So that zero is the most recent
    })

    // Get member
    const member = await guild.members.fetch(userId);

    // Throw if member is not in the guild
    if (!member) {
        throw new MessageError("User is not in the guild.");
    }



    const raiseChannel = await guild.channels.fetch(settings.raiseChannelId);

    if (!raiseChannel || raiseChannel.type !== ChannelType.GuildText) {
        throw new MessageError("Raise channel is not a text channel.");
    }

    const applicationData = application.data as unknown as ApplicationData


    const components =
        [new ButtonBuilder()
            .setLabel("Override & Approve")
            .setCustomId(`raise-approve:${applicationReference}`)
            .setStyle(ButtonStyle.Success),
        ]
    let followUpMention = ""
    if (!application.followUpChannelId) {
        components.push(new ButtonBuilder()
            .setLabel("Open Follow-up")
            .setCustomId(`raise-followup:${applicationReference}`)
            .setStyle(ButtonStyle.Primary))
    } else {
        followUpMention = `\n\nA followup has been opened in: <#${application.followUpChannelId}>`

        const followUpParentChannel = await guild.channels.fetch(settings.followUpChannelId)
        if (followUpParentChannel && followUpParentChannel.type === ChannelType.GuildText) {
            const thread = await followUpParentChannel.threads.fetch(application.followUpChannelId.toString(),)
            if (thread) {
                components.push(new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/channels/${guild.id}/${thread.id}/${thread.lastMessageId}`)
                    .setLabel("View followup thread"))
            }
        }

    }
    // If past applications exist, show a button to view them
    if (pastApplications > 0) {
        components.push(
            new ButtonBuilder()
                .setLabel("View Previous")
                .setCustomId(`view-past:${applicationReference}:0`)
                .setStyle(ButtonStyle.Primary),
        )
    }



    // If the bot has the correct permissions create a public thread on that message
    const permissionsInRaiseChannel = guild.members!.me!.permissionsIn(raiseChannel)
    if (!(permissionsInRaiseChannel.has(PermissionFlagsBits.CreatePublicThreads) && permissionsInRaiseChannel.has(PermissionFlagsBits.SendMessagesInThreads))) {
        throw new MessageError("The bot does not have the correct permissions to create a public thread in the raise channel.");
    }
    const thread = await raiseChannel.threads.create({ name: `Report of ${member.user.username}`, reason: "Raise report", autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek });
    // send message pinging
    const threadMessage = await thread.send({
        content: `<@${raiseMember.id}> raised an application by <@${member.user.id}>. <@&${settings.raiseRoleId}> with the reason ${reason}`, embeds: [new EmbedBuilder({
            title: `Reviewing ${member.user.username}'s application - raised by \`${raiseMember.user.username}\``,
            description: `Original Application submitted by: <@${member.user.id}> \`${member.user.username}#${member.user.discriminator}\` (\`${member.user.id}\`)` +
                `\n\n**Age**: ${applicationData.age}`
                + `\n**Pronouns**: ${applicationData.pronouns}`
                + `\n**Identity**: ${applicationData.identity}`
                + `\n**Reason**: ${applicationData.reason}`
                + `\n\n**Raised by**: <@${raiseMember.id}>`
                + `\n**Raise reason**: ${reason}` + followUpMention,
            color: embedRed
        })],
        components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
                components
            )
        ]
    })

    // update the application to be raised
    await prisma.verificationSubmission.update({
        where: {
            reference: applicationReference,
        }
        , data: {
            status: "RAISED",
            raiseMessageId: BigInt(threadMessage.id),
            raiseThreadId: BigInt(thread.id),
        }
    })

    const applicationMessageJumpLink = `https://discordapp.com/channels/${guild.id}/${thread.id}/${threadMessage.id}`;

    const embed = EmbedBuilder.from(message.embeds[0])
    embed.setDescription(`${embed.data.description}\n\nApplication has been raised. \n*See the report in <#${thread.id}> (link below) for more info & action buttons.*`)
    embed.setColor(embedRed)

    const originalMessageComponents = [
        new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder({
                label: "View Report",
                url: applicationMessageJumpLink,
                style: ButtonStyle.Link,
            }),
        ]),
    ];

    return { embed, originalMessageComponents }

}