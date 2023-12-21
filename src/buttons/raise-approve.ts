import { MessageError } from "../errors";
import { Button, } from "../types";
import approveLogic from "./shared-approve";


const button: Button<true> = {
    customIdLabel: 'raise-approve',
    settingsRequired: true,
    async execute(interaction, settings) {

        await interaction.deferUpdate()
        // First check if the interaction member has the required role
        if (!interaction.member.roles.cache.has(settings.raiseRoleId)) {
            throw new MessageError("You do not have the required role to take action on an application that has been raised.")
        }

        await approveLogic({ interaction, settings })

    },
};
module.exports = button