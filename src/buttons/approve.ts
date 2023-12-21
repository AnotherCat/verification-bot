
import { Button, } from "../types";
import approveLogic from "./shared-approve";
import { checkReviewerRole } from "../helpers/permissions";


const button: Button<true> = {
    customIdLabel: 'approve',
    settingsRequired: true,
    async execute(interaction, settings) {


        await checkReviewerRole(interaction, settings)
        await interaction.deferUpdate()
        await approveLogic({ interaction, settings })



    },
};
module.exports = button