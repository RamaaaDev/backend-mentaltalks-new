/*
  Warnings:

  - You are about to drop the `Article` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Coupon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING', 'PAYMENT', 'MEETING');

-- CreateEnum
CREATE TYPE "NotificationReferenceType" AS ENUM ('BOOKINGID', 'MEETINGID');

-- DropForeignKey
ALTER TABLE "Article" DROP CONSTRAINT "Article_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "booking_psychologist" DROP CONSTRAINT "booking_psychologist_booking_couponId_fkey";

-- DropTable
DROP TABLE "Article";

-- DropTable
DROP TABLE "Coupon";

-- DropTable
DROP TABLE "Payment";

-- CreateTable
CREATE TABLE "coupon" (
    "coupon_id" TEXT NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "coupon_value" INTEGER NOT NULL,
    "coupon_maxDiscount" INTEGER,
    "coupon_minPurchase" INTEGER,
    "coupon_usageLimit" INTEGER,
    "coupon_usedCount" INTEGER NOT NULL DEFAULT 0,
    "coupon_expiresAt" TIMESTAMP(3) NOT NULL,
    "coupon_isActive" BOOLEAN NOT NULL DEFAULT true,
    "coupon_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coupon_type" "DiscountType" NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("coupon_id")
);

-- CreateTable
CREATE TABLE "coupon_usage" (
    "couponUsage_id" TEXT NOT NULL,
    "couponUsage_couponId" TEXT NOT NULL,
    "couponUsage_userId" TEXT NOT NULL,
    "couponUsage_usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("couponUsage_id")
);

-- CreateTable
CREATE TABLE "article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "tags" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "orderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "redirectUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "paymentType" TEXT,
    "transactionId" TEXT,
    "transactionTime" TIMESTAMP(3),
    "fraudStatus" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "notification_id" TEXT NOT NULL,
    "notification_userId" TEXT NOT NULL,
    "notification_title" TEXT NOT NULL,
    "notification_body" TEXT NOT NULL,
    "notification_isRead" BOOLEAN NOT NULL DEFAULT false,
    "notification_type" "NotificationType" NOT NULL,
    "notification_referenceId" "NotificationReferenceType" NOT NULL,
    "notification_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_coupon_code_key" ON "coupon"("coupon_code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usage_couponUsage_couponId_couponUsage_userId_key" ON "coupon_usage"("couponUsage_couponId", "couponUsage_userId");

-- CreateIndex
CREATE UNIQUE INDEX "article_slug_key" ON "article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "payment_bookingId_key" ON "payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orderId_key" ON "payment"("orderId");

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_couponUsage_couponId_fkey" FOREIGN KEY ("couponUsage_couponId") REFERENCES "coupon"("coupon_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_couponUsage_userId_fkey" FOREIGN KEY ("couponUsage_userId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article" ADD CONSTRAINT "article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_psychologist" ADD CONSTRAINT "booking_psychologist_booking_couponId_fkey" FOREIGN KEY ("booking_couponId") REFERENCES "coupon"("coupon_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking_psychologist"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_notification_userId_fkey" FOREIGN KEY ("notification_userId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
