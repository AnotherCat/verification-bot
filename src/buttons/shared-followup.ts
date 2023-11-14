import { ButtonInteraction, ActionRowBuilder, ModalBuilder, ModalActionRowComponentBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { prisma } from ".."
import { MessageError } from "../errors"

const followupLogic = async (
    interaction: ButtonInteraction,
) => {


    // First get the applicationId from the customId
    const applicationReference = interaction.customId.split(":")[1]


    // Check the status of the current user, it must be pending
    const application = await prisma.verificationSubmission.findUnique({
        where: {
            reference: applicationReference,

        }
    })
    if (!application) {
        throw new MessageError("No application found for this user.")


    }

    if (application.status !== "PENDING" && application.status !== "RAISED") {
        throw new MessageError("This application is not pending.")
    }

    const userId = application.userId.toString()





    const member = await interaction.guild.members.fetch(userId)

    // Throw if member is not in the guild
    if (!member) {
        throw new MessageError("User is not in the guild.")
    }

    const modal = new ModalBuilder()
        .setCustomId(`followup:${applicationReference}`)
        .setTitle("Submit Application")

    const messageInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
        .setCustomId("message")
        .setLabel("Message to followup with")
        .setMaxLength(1000)
        .setRequired(false)
        .setPlaceholder("Leave blank to not send a message after opening the followup thread")
        .setStyle(TextInputStyle.Paragraph))

    modal.addComponents(

        messageInput,
    )

    await interaction.showModal(modal)






}

export default followupLogic