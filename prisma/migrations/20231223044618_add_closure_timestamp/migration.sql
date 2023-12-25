/*
  Warnings:

  - You are about to drop the column `timestamp` on the `VerificationSubmission` table. All the data in the column will be lost.
  - Added the required column `creationTimestamp` to the `VerificationSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

ALTER TABLE "VerificationSubmission"
RENAME COLUMN "timestamp" TO "creationTimestamp";
ALTER TABLE "VerificationSubmission" ADD COLUMN "closureTimestamp" TIMESTAMP(3);
