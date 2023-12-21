import { Button } from "../types"
import sharedButtonLogic from "./shared-past"


const button: Button<true> = {
    customIdLabel: "view-past",
    settingsRequired: true,
    async execute(interaction, settings) {
        const data = await sharedButtonLogic(interaction, settings)
        await interaction.reply({ ...data, ephemeral: true })
    }
}

module.exports = button