/*
  Warnings:

  - Added the required column `otp_type` to the `otp` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('REGISTER', 'FORGOT_PASSWORD');

-- AlterTable
ALTER TABLE "otp" ADD COLUMN     "otp_type" "OtpType" NOT NULL;
