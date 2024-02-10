import { SlashCommandBuilder } from "@discordjs/builders";

import { ButtonInteraction, CommandInteraction, ModalSubmitInteraction } from "discord.js";
import { prisma } from ".";




interface BaseInteractionResponse<
    InteractionTypeCached extends CommandInteraction<"cached"> | ButtonInteraction<"cached"> | ModalSubmitInteraction<"cached">,
    SettingsRequired extends boolean = false
> {
    settingsRequired: SettingsRequired;
    execute: (interaction: InteractionTypeCached, context: SettingsRequired extends true ? GuildSettingsParsed : GuildSettingsParsed | undefined) => Promise<void>;

}

interface ApplicationCommand<SettingsRequired extends boolean = false> extends BaseInteractionResponse<CommandInteraction<"cached">, SettingsRequired> {

    data: SlashCommandBuilder;
}

interface Button<SettingsRequired extends boolean = false> extends BaseInteractionResponse<ButtonInteraction<"cached">, SettingsRequired> {
    customIdLabel: string;
}

interface Modal<SettingsRequired extends boolean = false> extends BaseInteractionResponse<ModalSubmitInteraction<"cached">, SettingsRequired> {
    customIdLabel: string;
}

function isSettingsRequired(data: (ApplicationCommand | Button | Modal) | ApplicationCommand<true> | Button<true> | Modal<true>): data is ApplicationCommand<true> | Button<true> | Modal<true> {
    return data.settingsRequired;
}
interface ApplicationData {
    age: string,
    pronouns: string,
    reason: string,
    identity?: string,
    gender?: string,
    sexuality?: string,

}

interface GuildSettingsParsed {
    promptChannelId: string
    promptMessageContent: string
    promptMessageId: string | null
    reviewChannelId: string
    followUpChannelId: string
    raiseChannelId: string
    logChannelId: string
    raiseRoleId: string
    reviewerRoleId: string
    followUpPingRoleIds: string[]
    addRoleId: string | null
    removeRoleId: string | null
    successMessageChannelId: string
    successMessage: string
}

type GuildSettingsParsedReturn = { success: false } | { success: true, data: GuildSettingsParsed }

async function getGuildSettings(guildId: string): Promise<GuildSettingsParsedReturn> {
    const settings = await prisma.guildSettings.findUnique(
        {
            where: {
                guildId: BigInt(guildId),
            },
        },
    );

    if (!settings) {
        return { success: false };
    }

    if (!settings.promptChannelId || !settings.promptMessageContent || !settings.reviewChannelId || !settings.followUpChannelId || !settings.raiseChannelId || !settings.logChannelId || !settings.raiseRoleId || !settings.reviewerRoleId || !settings.successMessageChannelId || !settings.successMessageContent || (
        !settings.addRoleId && !settings.addRoleId
    )) {
        return { success: false };
    }
    console.log(settings, 'types.ts')
    return {
        success: true,
        data: {
            promptChannelId: settings.promptChannelId.toString(),
            promptMessageContent: settings.promptMessageContent,
            promptMessageId: settings.promptMessageId?.toString() ?? null,
            reviewChannelId: settings.reviewChannelId.toString(),
            followUpChannelId: settings.followUpChannelId.toString(),
            raiseChannelId: settings.raiseChannelId.toString(),
            logChannelId: settings.logChannelId.toString(),
            raiseRoleId: settings.raiseRoleId.toString(),
            reviewerRoleId: settings.reviewerRoleId.toString(),
            followUpPingRoleIds: settings.followUpPingRoleIds,
            addRoleId: settings.addRoleId?.toString() ?? null,
            removeRoleId: settings.removeRoleId?.toString() ?? null,
            successMessageChannelId: settings.successMessageChannelId.toString(),
            successMessage: settings.successMessageContent,

        },
    };

}

export {
    ApplicationCommand,
    Button, Modal, ApplicationData,
    isSettingsRequired,
    GuildSettingsParsed,
    getGuildSettings, GuildSettingsParsedReturn

}

