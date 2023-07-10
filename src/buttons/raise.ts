import { ButtonInteraction, MessageActionRow, MessageEmbed, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { Button } from "../types";
import { addRole, removeRole, successMessage, followupChannel } from "../settings.json"


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

        const modal = new Modal()
            .setCustomId(interaction.customId)
            .setTitle("Raise application to moderators")

        const messageInput = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
            .setCustomId("reason")
            .setLabel("Reason for raising the application")
            .setMaxLength(1000)
            .setRequired(true)
            .setStyle("PARAGRAPH"))

        modal.addComponents(

            messageInput,
        )

        await interaction.showModal(modal)






    },
};
module.exports = button