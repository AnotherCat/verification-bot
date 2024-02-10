import { Button } from "../types"
import sharedButtonLogic from "./shared-past"


const button: Button<true> = {
    customIdLabel: "view-past",
    settingsRequired: true,
    async execute(interaction, settings) {
        console.log(settings, 'past-view.ts')
        console.log("HI")
        const data = await sharedButtonLogic(interaction, settings)
        await interaction.reply({ ...data, ephemeral: true })
    }
}

module.exports = button