import { ButtonInteraction, MessageEmbed } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { Button } from "../types";
import { addRole, removeRole, successMessage, followupChannel } from "../settings.json"
import approveLogic from "./shared-approve";


const button: Button = {
    customIdLabel: 'approve',
    async execute(interaction: ButtonInteraction) {

        await interaction.deferReply({ ephemeral: true })
        await approveLogic({ interaction })



    },
};
module.exports = button