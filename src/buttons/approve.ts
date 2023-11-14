import { ButtonInteraction, } from "discord.js";
import { Button } from "../types";
import approveLogic from "./shared-approve";


const button: Button = {
    customIdLabel: 'approve',
    async execute(interaction: ButtonInteraction) {

        await interaction.deferReply({ ephemeral: true })
        await approveLogic({ interaction })



    },
};
module.exports = button