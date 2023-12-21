-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "reviewChannelId" BIGINT;

-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" BIGINT NOT NULL,
    "promptChannelId" BIGINT,
    "promptMessageContent" TEXT,
    "promptMessageId" BIGINT,
    "reviewChannelId" BIGINT,
    "followUpChannelId" BIGINT,
    "raiseChannelId" BIGINT,
    "logChannelId" BIGINT,
    "raiseRoleId" BIGINT,
    "reviewerRoleId" BIGINT,
    "followUpPingRoleIds" TEXT[],
    "addRoleId" BIGINT,
    "removeRoleId" BIGINT,
    "successMessageChannelId" BIGINT,
    "successMessageContent" TEXT,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildSettings_guildId_key" ON "GuildSettings"("guildId");

-- AddForeignKey
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
