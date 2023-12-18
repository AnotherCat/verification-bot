import { ButtonInteraction, GuildMemberRoleManager, } from "discord.js";

import { MessageError } from "../errors";
import { Button } from "../types";
import followupLogic from "./shared-followup";
import { config } from "..";


const button: Button = {
    customIdLabel: 'raise-followup',
    async execute(interaction: ButtonInteraction) {

        if (!interaction.guild || !interaction.member) {
            throw new Error("This command can only be used in a server.");
        }

        // First check if the interaction member has the requried role
        if ((interaction.member.roles instanceof GuildMemberRoleManager && !interaction.member.roles.cache.has(config.RAISE_ROLE)) || (!(interaction.member.roles instanceof GuildMemberRoleManager) && !(interaction.member.roles.indexOf(config.RAISE_ROLE) > -1))) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }
        await followupLogic(interaction)
    },
};
module.exports = button