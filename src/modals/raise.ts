import { Modal } from "../types";
import sharedRaise from "../shared/raise";

const modal: Modal<true> = {
    customIdLabel: "raise",
    settingsRequired: true,
    async execute(interaction, settings) {
        // defer update
        await interaction.deferUpdate();

        if (!interaction.message) {
            throw new Error("This command can only be used in a server.");
        }

        // get applicationId from customId
        const applicationReference = interaction.customId.split(":")[1];


        const reason = interaction.fields.getTextInputValue(
            "reason"
        )
            ;

        const { embed, originalMessageComponents } = await sharedRaise({
            applicationReference,
            guild: interaction.guild,
            reason,
            settings,
            raiseMember: interaction.member,
            message: interaction.message
        })


        // Update the message to show it's been raised

        // Add a note to the end of the embeds description and disable all buttons


        await interaction.editReply({
            embeds: [embed],
            components: originalMessageComponents,
        });
    },
};

module.exports = modal;
