import { ButtonInteraction, ActionRowBuilder, ModalBuilder, TextInputBuilder, ModalActionRowComponentBuilder, TextInputStyle } from "discord.js";
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



        const modal = new ModalBuilder()
            .setCustomId("submit-application")
            .setTitle("Submit Application")

        const pronounInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("pronouns")
            .setLabel("Pronouns")
            .setMaxLength(100)
            .setRequired(true)
            .setPlaceholder("they/them")
            .setStyle(TextInputStyle.Short))

        const ageInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("age")
            .setLabel("Age")
            .setMaxLength(3)
            .setRequired(true)
            .setPlaceholder("Exact age is required - eg 17")
            .setStyle(TextInputStyle.Short))

        const queerIdentity = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("identity")
            .setLabel("Queer Identity(s)")
            .setMaxLength(500)
            .setRequired(true)
            .setPlaceholder("Your queer identities, if any, here")
            .setStyle(TextInputStyle.Short))

        const joiningReason = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Joining Reason")
            .setMaxLength(500)
            .setRequired(true)
            .setPlaceholder("Why did you decide to join this server?")
            .setStyle(TextInputStyle.Paragraph))

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