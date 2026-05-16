/*
  Warnings:

  - Added the required column `location_navigation` to the `location_office` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "location_office" ADD COLUMN     "location_navigation" TEXT NOT NULL;
