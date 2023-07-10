-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'RAISED', 'FOLLOWUP', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "Guild" (
    "id" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationSubmission" (
    "reference" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "reviewMessageId" BIGINT NOT NULL,
    "reviewMessageChannelId" BIGINT NOT NULL,
    "reviewMessageDeleted" BOOLEAN NOT NULL DEFAULT false,
    "followUpChannelId" BIGINT,
    "guildId" BIGINT NOT NULL,

    CONSTRAINT "VerificationSubmission_pkey" PRIMARY KEY ("reference")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_id_key" ON "Guild"("id");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationSubmission_reference_key" ON "VerificationSubmission"("reference");

-- AddForeignKey
ALTER TABLE "VerificationSubmission" ADD CONSTRAINT "VerificationSubmission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
