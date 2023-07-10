import { ButtonInteraction, MessageActionRow, MessageEmbed, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";
import { prisma } from "..";
import { embedGreen } from "../const";
import { MessageError } from "../errors";
import { Button } from "../types";
import followupLogic from "./shared-followup";


const button: Button = {
    customIdLabel: 'followup',
    execute: followupLogic
};
module.exports = button