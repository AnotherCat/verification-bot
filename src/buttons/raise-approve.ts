import { ButtonInteraction, GuildMemberRoleManager, } from "discord.js";

import { MessageError } from "../errors";
import { Button } from "../types";
import { raiseRole, } from "../settings.json"
import approveLogic from "./shared-approve";


const button: Button = {
    customIdLabel: 'raise-approve',
    async execute(interaction: ButtonInteraction) {


        await interaction.deferReply({ ephemeral: true })
        // First check if the interaction member has the required role
        if (!((interaction.member.roles instanceof GuildMemberRoleManager && interaction.member.roles.cache.has(raiseRole)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && (interaction.member.roles.indexOf(raiseRole) > -1)))) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }

        await approveLogic({ interaction })

    },
};
module.exports = button