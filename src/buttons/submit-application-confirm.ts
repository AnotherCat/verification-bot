import { ButtonInteraction, MessageActionRow, MessageButton, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import { prisma } from "..";
import { MessageError } from "../errors";
import { Button } from "../types";


const button: Button = {
    customIdLabel: 'submit-application-confirm',
    async execute(interaction: ButtonInteraction) {

        // Check if the current user has a pending or raised application 
        const application = await prisma.verificationSubmission.findFirst({
            where: {
                userId: BigInt(interaction.member.user.id),
            },
            orderBy: { timestamp: "desc" },
        })
        if (application && (application.status === "PENDING" || application.status === "RAISED" || application.status === "FOLLOWUP")) {
            throw new MessageError("You already have a pending application, please wait for that to be reviewed.")
        }


        // Reply with a verification application modal



        const modal = new Modal()
            .setCustomId("submit-application")
            .setTitle("Submit Application")

        const pronounInput = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
            .setCustomId("pronouns")
            .setLabel("Pronouns")
            .setMaxLength(100)
            .setRequired(true)
            .setPlaceholder("they/them")
            .setStyle("SHORT"))

        const ageInput = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
            .setCustomId("age")
            .setLabel("Age")
            .setMaxLength(3)
            .setRequired(true)
            .setPlaceholder("Exact age is required - eg 17")
            .setStyle("SHORT"))

        const queerIdentity = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
            .setCustomId("identity")
            .setLabel("Queer Identity(s)")
            .setMaxLength(500)
            .setRequired(true)
            .setPlaceholder("Your queer identities, if any, here")
            .setStyle("SHORT"))

        const joiningReason = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
            .setCustomId("reason")
            .setLabel("Joining Reason")
            .setMaxLength(500)
            .setRequired(true)
            .setPlaceholder("Why did you decide to join this server?")
            .setStyle("PARAGRAPH"))

        modal.addComponents(
            ageInput,
            queerIdentity,
            joiningReason,
            pronounInput,
        )

        await interaction.showModal(modal)


    },
};
module.exports = button