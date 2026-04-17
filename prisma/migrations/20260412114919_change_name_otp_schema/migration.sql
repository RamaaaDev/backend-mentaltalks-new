/*
  Warnings:

  - The primary key for the `otp` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `otp` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[otp_userId]` on the table `otp` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `otp_code` to the `otp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `otp_expiredAt` to the `otp` table without a default value. This is not possible if the table is not empty.
  - The required column `otp_id` was added to the `otp` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `otp_userId` to the `otp` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "otp" DROP CONSTRAINT "otp_userId_fkey";

-- DropIndex
DROP INDEX "otp_userId_key";

-- AlterTable
ALTER TABLE "otp" DROP CONSTRAINT "otp_pkey",
DROP COLUMN "code",
DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "id",
DROP COLUMN "userId",
ADD COLUMN     "otp_code" TEXT NOT NULL,
ADD COLUMN     "otp_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "otp_expiredAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "otp_id" TEXT NOT NULL,
ADD COLUMN     "otp_userId" TEXT NOT NULL,
ADD CONSTRAINT "otp_pkey" PRIMARY KEY ("otp_id");

-- CreateIndex
CREATE UNIQUE INDEX "otp_otp_userId_key" ON "otp"("otp_userId");

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_otp_userId_fkey" FOREIGN KEY ("otp_userId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
