import { Button } from "../types"
import { ButtonInteraction } from "discord.js"
import sharedButtonLogic from "./shared-past"


const button: Button = {
    customIdLabel: "past",
    async execute(interaction: ButtonInteraction) {
        const data = await sharedButtonLogic(interaction)
        await interaction.update(data)
    }

}

module.exports = button