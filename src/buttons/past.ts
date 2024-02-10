import { Button } from "../types"
import sharedButtonLogic from "./shared-past"


const button: Button<true> = {
    customIdLabel: "past",
    settingsRequired: true,
    async execute(interaction, settings) {
        console.log(settings, 'past.ts')
        console.log("HI")
        const data = await sharedButtonLogic(interaction, settings)
        await interaction.update(data)
    }

}

module.exports = button