import { ButtonInteraction, } from "discord.js";
import { Button } from "../types";
import approveLogic from "./shared-approve";
import { checkReviewerRole } from "../helpers/permissions";


const button: Button = {
    customIdLabel: 'approve',
    async execute(interaction: ButtonInteraction) {


        await checkReviewerRole(interaction)
        await interaction.deferReply({ ephemeral: true })
        await approveLogic({ interaction })



    },
};
module.exports = button