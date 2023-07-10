import { SlashCommandBuilder } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, ModalSubmitInteraction } from "discord.js";

interface ApplicationCommand {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}

interface Button {
    customIdLabel: string;
    execute: (interaction: ButtonInteraction) => Promise<void>;
}

interface Modal {
    customIdLabel: string;
    execute: (interaction: ModalSubmitInteraction) => Promise<void>
}

interface ApplicationData {
    age: string,
    pronouns: string,
    reason: string,
    identity: string,

}

export {
    ApplicationCommand,
    Button, Modal, ApplicationData
}

