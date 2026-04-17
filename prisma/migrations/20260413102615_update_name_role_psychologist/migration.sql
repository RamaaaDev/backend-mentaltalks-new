/*
  Warnings:

  - The values [PSIKOLOG] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN', 'PSYCHOLOGIST');
ALTER TABLE "public"."user" ALTER COLUMN "user_role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "user_role" TYPE "Role_new" USING ("user_role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "user" ALTER COLUMN "user_role" SET DEFAULT 'USER';
COMMIT;
