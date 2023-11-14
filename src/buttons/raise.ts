import { ButtonInteraction, ActionRowBuilder, ModalBuilder, ModalActionRowComponentBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { prisma } from "..";
import { MessageError } from "../errors";
import { Button } from "../types";


const button: Button = {
    customIdLabel: 'raise',
    async execute(interaction: ButtonInteraction) {
        // First get the applicationId from the customId
        const applicationReference = interaction.customId.split(":")[1]

        // Check the status of the current user, it must be pending or followup
        const application = await prisma.verificationSubmission.findUnique({
            where: {
                reference: applicationReference,

            }
        })
        if (!application) {
            throw new MessageError("No application found for this user.")
        }
        if (application.status !== "PENDING" && application.status !== "FOLLOWUP") {
            throw new MessageError("This application is not pending.")
        }

        const userId = application.userId.toString()

        const modal = new ModalBuilder()
            .setCustomId(interaction.customId)
            .setTitle("Raise application to moderators")

        const messageInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Reason for raising the application")
            .setMaxLength(1000)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph))

        modal.addComponents(

            messageInput,
        )

        await interaction.showModal(modal)






    },
};
module.exports = button