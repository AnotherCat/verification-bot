
import { EmbedBuilder } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { Modal } from "../types";


const modal: Modal<false> = {
    customIdLabel: 'setup',
    settingsRequired: false,
    async execute(interaction) {

        // Reply with an ephemeral defer
        // Then send the application to the review channel
        // Then store the application in the database
        // Then update the interaction reply with a confirmation for the user
        await interaction.deferUpdate()

        const settings = await prisma.guildSettings.findUnique({
            where: {
                guildId: BigInt(interaction.guildId)
            }
        })

        const successMessageContent = interaction.fields.getTextInputValue("success") ?? settings?.successMessageContent
        const promptMessageContent = interaction.fields.getTextInputValue("prompt") ?? settings?.promptMessageContent


        await prisma.guildSettings.upsert({
            where: {
                guildId: BigInt(interaction.guildId)
            },
            create: {
                successMessageContent, promptMessageContent,
                guild: {
                    connectOrCreate: {
                        where: {
                            id: BigInt(interaction.guildId)
                        },
                        create: {
                            id: BigInt(interaction.guildId)
                        }
                    }
                }

            },
            update: {
                successMessageContent, promptMessageContent

            }
        }
        )


        // Send success message
        await interaction.editReply({
            embeds: [
                new EmbedBuilder({
                    title: "Settings updated",
                    description: `Settings have been updated! `
                    , color: embedGreen
                })
            ],
            content: undefined,
            components: []
        })


    },
};
module.exports = modal