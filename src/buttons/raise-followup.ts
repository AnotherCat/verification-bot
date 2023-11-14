import { ButtonInteraction, GuildMemberRoleManager, } from "discord.js";

import { MessageError } from "../errors";
import { Button } from "../types";
import { raiseRole } from "../settings.json";
import followupLogic from "./shared-followup";


const button: Button = {
    customIdLabel: 'raise-followup',
    async execute(interaction: ButtonInteraction) {

        // First check if the interaction member has the requried role
        if ((interaction.member.roles instanceof GuildMemberRoleManager && !interaction.member.roles.cache.has(raiseRole)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && !(interaction.member.roles.indexOf(raiseRole) > -1))) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }
        await followupLogic(interaction)
    },
};
module.exports = button