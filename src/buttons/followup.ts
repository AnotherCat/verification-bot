import { checkReviewerRole } from "../helpers/permissions";
import { Button } from "../types";
import followupLogic from "./shared-followup";


const button: Button = {
    customIdLabel: 'followup',
    async execute(interaction) {
        await checkReviewerRole(interaction)
        await followupLogic(interaction)
    }
};
module.exports = button