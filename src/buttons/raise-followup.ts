import { MessageError } from "../errors";
import { Button } from "../types";
import followupLogic from "./shared-followup";

const button: Button<true> = {
    customIdLabel: 'raise-followup',
    settingsRequired: true,
    async execute(interaction, settings) {
        // First check if the interaction member has the requried role
        if (!interaction.member.roles.cache.has(settings.raiseRoleId)) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }
        await followupLogic(interaction)
    },
};
module.exports = button