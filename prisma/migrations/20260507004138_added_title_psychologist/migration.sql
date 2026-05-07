-- CreateEnum
CREATE TYPE "TitlePsychologist" AS ENUM ('PEERCOUNSELOR', 'COUNSELOR', 'PSYCHOLOGIST');

-- AlterTable
ALTER TABLE "psychologist_profiles" ADD COLUMN     "psychologist_methode" TEXT[],
ADD COLUMN     "psychologist_title" "TitlePsychologist",
ALTER COLUMN "psychologist_sipp" DROP NOT NULL;
