import { SlashCommandBuilder, } from '@discordjs/builders';
import { PermissionFlagsBits, } from 'discord-api-types/v10';
import { ApplicationCommand } from '../types';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';



const command: ApplicationCommand<true> = {
    settingsRequired: true,
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send prompt to prompt channel')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),


    async execute(interaction, settings) {
        const promptChannel = await interaction.guild.channels.fetch(settings.promptChannelId)
        if (!promptChannel || !promptChannel.isTextBased()) { await interaction.reply({ content: `The prompt channel could not be found.`, ephemeral: true }); return; }
        const promptMessage = settings.promptMessageContent

        await promptChannel.send({
            content: promptMessage,
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents([
                    new ButtonBuilder()
                        .setCustomId("submit-application")
                        .setLabel("Submit Application")
                        .setStyle(ButtonStyle.Primary)
                ])],
        })


    }
}

module.exports = command