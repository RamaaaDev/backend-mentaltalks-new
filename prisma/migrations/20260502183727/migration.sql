/*
  Warnings:

  - A unique constraint covering the columns `[user_email]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `psychologist_location` to the `psychologist_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `psychologist_sessionDone` to the `psychologist_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `psychologist_sipp` to the `psychologist_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "psychologist_profiles" ADD COLUMN     "psychologist_location" TEXT NOT NULL,
ADD COLUMN     "psychologist_sessionDone" INTEGER NOT NULL,
ADD COLUMN     "psychologist_sipp" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "schedule_isBooked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "user_user_email_key" ON "user"("user_email");
