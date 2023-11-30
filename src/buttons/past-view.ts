import { Button } from "../types"
import { ButtonInteraction } from "discord.js"
import sharedButtonLogic from "./shared-past"


const button: Button = {
    customIdLabel: "view-past",
    async execute(interaction: ButtonInteraction) {
        const data = await sharedButtonLogic(interaction)
        await interaction.reply({ ...data, ephemeral: true })
    }
}

module.exports = button