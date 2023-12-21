import { checkReviewerRole } from "../helpers/permissions";
import { Button } from "../types";
import followupLogic from "./shared-followup";


const button: Button<true> = {
    customIdLabel: 'followup',
    settingsRequired: true,
    async execute(interaction, settings) {
        await checkReviewerRole(interaction, settings)
        await followupLogic(interaction)
    }
};
module.exports = button