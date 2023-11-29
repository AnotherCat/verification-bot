import { GuildMemberRoleManager, Interaction } from "discord.js"
import { MessageError } from "../errors"
import { reviewerRole } from "../settings.json"

async function checkReviewerRole(interaction: Interaction) {
    if (!((interaction.member.roles instanceof GuildMemberRoleManager && interaction.member.roles.cache.has(reviewerRole)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && (interaction.member.roles.indexOf(reviewerRole) > -1)))) {
        throw new MessageError("You do not have the required role to take action on an application that has been raised.")
    }

}

export { checkReviewerRole }