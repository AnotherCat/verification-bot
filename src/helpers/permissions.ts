import { GuildMemberRoleManager, Interaction } from "discord.js"
import { MessageError } from "../errors"
import { GuildSettingsParsed } from "../types"

async function checkReviewerRole(interaction: Interaction<"cached">, settings: GuildSettingsParsed) {

    console.log(settings, 'permissions.ts')

    if (!(interaction.member.roles instanceof GuildMemberRoleManager && interaction.member.roles.cache.has(settings.reviewerRoleId))) {
        throw new MessageError("You do not have the required role to take action on an application that has been raised.")
    }

}

export { checkReviewerRole }