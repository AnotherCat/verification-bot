import { Button } from "../types"
import sharedButtonLogic from "./shared-past"


const button: Button<true> = {
    customIdLabel: "past",
    settingsRequired: true,
    async execute(interaction, settings) {
        const data = await sharedButtonLogic(interaction, settings)
        await interaction.update(data)
    }

}

module.exports = button