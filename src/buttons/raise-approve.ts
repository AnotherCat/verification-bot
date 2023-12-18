import { ButtonInteraction, GuildMemberRoleManager, } from "discord.js";

import { MessageError } from "../errors";
import { Button } from "../types";
import approveLogic from "./shared-approve";
import { config } from "..";


const button: Button = {
    customIdLabel: 'raise-approve',
    async execute(interaction: ButtonInteraction) {

        if (!interaction.guild || !interaction.member) {
            throw new Error("This command can only be used in a server.");
        }

        await interaction.deferUpdate()
        // First check if the interaction member has the required role
        if (!((interaction.member.roles instanceof GuildMemberRoleManager && interaction.member.roles.cache.has(config.RAISE_ROLE)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && (interaction.member.roles.indexOf(config.RAISE_ROLE) > -1)))) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }

        await approveLogic({ interaction })

    },
};
module.exports = button