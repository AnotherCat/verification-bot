import { GuildMemberRoleManager, Interaction } from "discord.js"
import { MessageError } from "../errors"
import { config } from ".."

async function checkReviewerRole(interaction: Interaction) {
    if (!interaction.member || !((interaction.member.roles instanceof GuildMemberRoleManager && interaction.member.roles.cache.has(config.REVIEWER_ROLE)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && (interaction.member.roles.indexOf(config.REVIEWER_ROLE) > -1)))) {
        throw new MessageError("You do not have the required role to take action on an application that has been raised.")
    }

}

export { checkReviewerRole }