-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'PSIKOLOG');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('KONSULTASI', 'EDUKASI', 'MEDITASI');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('CHAT', 'ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELED');

-- CreateTable
CREATE TABLE "user" (
    "user_id" TEXT NOT NULL,
    "user_username" TEXT NOT NULL,
    "user_name" TEXT,
    "user_email" TEXT,
    "user_phone" TEXT,
    "user_role" "Role" NOT NULL DEFAULT 'USER',
    "user_birthday" TIMESTAMP(3),
    "user_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_updatedAt" TIMESTAMP(3) NOT NULL,
    "user_isActive" BOOLEAN NOT NULL DEFAULT false,
    "user_photos" TEXT,
    "user_passwordHash" TEXT,
    "user_refreshToken" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "admin_id" TEXT NOT NULL,
    "admin_userId" TEXT NOT NULL,
    "admin_specialty" TEXT NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "psychologist_profiles" (
    "psychologist_id" TEXT NOT NULL,
    "psychologist_userId" TEXT NOT NULL,
    "psychologist_name" TEXT NOT NULL,
    "psychologist_education" TEXT[],
    "psychologist_bio" TEXT NOT NULL,
    "psychologist_quotes" TEXT,
    "psychologist_specialties" TEXT[],
    "psychologist_yearsExperience" INTEGER NOT NULL,
    "psychologist_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "psychologist_ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "psychologist_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "psychologist_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psychologist_profiles_pkey" PRIMARY KEY ("psychologist_id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "schedule_id" TEXT NOT NULL,
    "schedule_psychologistId" TEXT NOT NULL,
    "schedule_startTime" TIMESTAMP(3) NOT NULL,
    "schedule_endTime" TIMESTAMP(3) NOT NULL,
    "schedule_locationId" TEXT,
    "schedule_price" INTEGER NOT NULL,
    "schedule_type" "MeetingType" NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "Coupon" (
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

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("coupon_id")
);

-- CreateTable
CREATE TABLE "location_office" (
    "location_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_address" TEXT NOT NULL,
    "location_addressDetail" TEXT NOT NULL,
    "location_photos" TEXT[],
    "location_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_office_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "reviews_psikolog" (
    "reviewPsikolog_id" TEXT NOT NULL,
    "reviewPsikolog_userId" TEXT NOT NULL,
    "reviewPsikolog_psychologistId" TEXT NOT NULL,
    "reviewPsikolog_bookingId" TEXT,
    "reviewPsikolog_rating" INTEGER NOT NULL,
    "reviewPsikolog_comment" TEXT,
    "reviewPsikolog_isVerified" BOOLEAN NOT NULL DEFAULT false,
    "reviewPsikolog_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewPsikolog_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_psikolog_pkey" PRIMARY KEY ("reviewPsikolog_id")
);

-- CreateTable
CREATE TABLE "reviews_office" (
    "reviewOffice_id" TEXT NOT NULL,
    "reviewOffice_userId" TEXT NOT NULL,
    "reviewOffice_locationId" TEXT NOT NULL,
    "reviewOffice_bookingId" TEXT,
    "reviewOffice_rating" INTEGER NOT NULL,
    "reviewOffice_comment" TEXT,
    "reviewOffice_photos" TEXT[],
    "reviewOffice_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewOffice_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_office_pkey" PRIMARY KEY ("reviewOffice_id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "testimonial_id" TEXT NOT NULL,
    "testimonial_userId" TEXT NOT NULL,
    "testimonial_rating" DOUBLE PRECISION NOT NULL,
    "testimonial_comment" TEXT NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("testimonial_id")
);

-- CreateTable
CREATE TABLE "Article" (
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

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_psychologist" (
    "booking_id" TEXT NOT NULL,
    "booking_userId" TEXT NOT NULL,
    "booking_psychologistId" TEXT NOT NULL,
    "booking_scheduleId" TEXT NOT NULL,
    "booking_couponId" TEXT,
    "booking_status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "booking_type" "MeetingType" NOT NULL,
    "booking_notes" TEXT,
    "booking_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_psychologist_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "Payment" (
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

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_rooms" (
    "meeting_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "meeting_hostId" TEXT NOT NULL,
    "meeting_participantId" TEXT NOT NULL,
    "meeting_scheduleAt" TIMESTAMP(3) NOT NULL,
    "meeting_startedAt" TIMESTAMP(3),
    "meeting_endedAt" TIMESTAMP(3),
    "meeting_status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meeting_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meeting_updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_rooms_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "meeting_messages" (
    "meetingMessage_id" TEXT NOT NULL,
    "meetingMessage_roomId" TEXT NOT NULL,
    "meetingMessage_senderId" TEXT NOT NULL,
    "meetingMessage_content" TEXT NOT NULL,
    "meetingMessage_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_messages_pkey" PRIMARY KEY ("meetingMessage_id")
);

-- CreateTable
CREATE TABLE "meeting_recordings" (
    "meetingRecord_id" TEXT NOT NULL,
    "meetingRecord_roomId" TEXT NOT NULL,
    "meetingRecord_fileUrl" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "meetingRecord_endedAt" TIMESTAMP(3) NOT NULL,
    "meetingRecord_createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_recordings_pkey" PRIMARY KEY ("meetingRecord_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_user_username_key" ON "user"("user_username");

-- CreateIndex
CREATE INDEX "user_user_role_idx" ON "user"("user_role");

-- CreateIndex
CREATE UNIQUE INDEX "otp_userId_key" ON "otp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_admin_userId_key" ON "admin_profiles"("admin_userId");

-- CreateIndex
CREATE UNIQUE INDEX "psychologist_profiles_psychologist_userId_key" ON "psychologist_profiles"("psychologist_userId");

-- CreateIndex
CREATE INDEX "psychologist_profiles_psychologist_specialties_idx" ON "psychologist_profiles"("psychologist_specialties");

-- CreateIndex
CREATE INDEX "schedules_schedule_psychologistId_schedule_startTime_schedu_idx" ON "schedules"("schedule_psychologistId", "schedule_startTime", "schedule_type", "schedule_locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_coupon_code_key" ON "Coupon"("coupon_code");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_psikolog_reviewPsikolog_bookingId_key" ON "reviews_psikolog"("reviewPsikolog_bookingId");

-- CreateIndex
CREATE INDEX "reviews_psikolog_reviewPsikolog_psychologistId_reviewPsikol_idx" ON "reviews_psikolog"("reviewPsikolog_psychologistId", "reviewPsikolog_rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_psikolog_reviewPsikolog_userId_reviewPsikolog_psych_key" ON "reviews_psikolog"("reviewPsikolog_userId", "reviewPsikolog_psychologistId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_office_reviewOffice_bookingId_key" ON "reviews_office"("reviewOffice_bookingId");

-- CreateIndex
CREATE INDEX "reviews_office_reviewOffice_locationId_reviewOffice_rating_idx" ON "reviews_office"("reviewOffice_locationId", "reviewOffice_rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_office_reviewOffice_userId_reviewOffice_locationId_key" ON "reviews_office"("reviewOffice_userId", "reviewOffice_locationId");

-- CreateIndex
CREATE UNIQUE INDEX "testimonials_testimonial_userId_key" ON "testimonials"("testimonial_userId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "booking_psychologist_booking_scheduleId_key" ON "booking_psychologist"("booking_scheduleId");

-- CreateIndex
CREATE INDEX "booking_psychologist_booking_userId_booking_status_idx" ON "booking_psychologist"("booking_userId", "booking_status");

-- CreateIndex
CREATE INDEX "booking_psychologist_booking_psychologistId_booking_status_idx" ON "booking_psychologist"("booking_psychologistId", "booking_status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_rooms_meeting_id_key" ON "meeting_rooms"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_rooms_booking_id_key" ON "meeting_rooms"("booking_id");

-- CreateIndex
CREATE INDEX "meeting_rooms_meeting_hostId_idx" ON "meeting_rooms"("meeting_hostId");

-- CreateIndex
CREATE INDEX "meeting_rooms_meeting_participantId_idx" ON "meeting_rooms"("meeting_participantId");

-- CreateIndex
CREATE INDEX "meeting_messages_meetingMessage_roomId_idx" ON "meeting_messages"("meetingMessage_roomId");

-- CreateIndex
CREATE INDEX "meeting_messages_meetingMessage_senderId_idx" ON "meeting_messages"("meetingMessage_senderId");

-- CreateIndex
CREATE INDEX "meeting_recordings_meetingRecord_roomId_idx" ON "meeting_recordings"("meetingRecord_roomId");

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_admin_userId_fkey" FOREIGN KEY ("admin_userId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psychologist_profiles" ADD CONSTRAINT "psychologist_profiles_psychologist_userId_fkey" FOREIGN KEY ("psychologist_userId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_schedule_locationId_fkey" FOREIGN KEY ("schedule_locationId") REFERENCES "location_office"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_schedule_psychologistId_fkey" FOREIGN KEY ("schedule_psychologistId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_psikolog" ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_userId_fkey" FOREIGN KEY ("reviewPsikolog_userId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_psikolog" ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_psychologistId_fkey" FOREIGN KEY ("reviewPsikolog_psychologistId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_psikolog" ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_bookingId_fkey" FOREIGN KEY ("reviewPsikolog_bookingId") REFERENCES "booking_psychologist"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_office" ADD CONSTRAINT "reviews_office_reviewOffice_userId_fkey" FOREIGN KEY ("reviewOffice_userId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_office" ADD CONSTRAINT "reviews_office_reviewOffice_locationId_fkey" FOREIGN KEY ("reviewOffice_locationId") REFERENCES "location_office"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews_office" ADD CONSTRAINT "reviews_office_reviewOffice_bookingId_fkey" FOREIGN KEY ("reviewOffice_bookingId") REFERENCES "booking_psychologist"("booking_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_testimonial_userId_fkey" FOREIGN KEY ("testimonial_userId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_psychologist" ADD CONSTRAINT "booking_psychologist_booking_userId_fkey" FOREIGN KEY ("booking_userId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_psychologist" ADD CONSTRAINT "booking_psychologist_booking_psychologistId_fkey" FOREIGN KEY ("booking_psychologistId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_psychologist" ADD CONSTRAINT "booking_psychologist_booking_scheduleId_fkey" FOREIGN KEY ("booking_scheduleId") REFERENCES "schedules"("schedule_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_psychologist" ADD CONSTRAINT "booking_psychologist_booking_couponId_fkey" FOREIGN KEY ("booking_couponId") REFERENCES "Coupon"("coupon_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking_psychologist"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking_psychologist"("booking_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_meeting_hostId_fkey" FOREIGN KEY ("meeting_hostId") REFERENCES "psychologist_profiles"("psychologist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_rooms" ADD CONSTRAINT "meeting_rooms_meeting_participantId_fkey" FOREIGN KEY ("meeting_participantId") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_messages" ADD CONSTRAINT "meeting_messages_meetingMessage_roomId_fkey" FOREIGN KEY ("meetingMessage_roomId") REFERENCES "meeting_rooms"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_messages" ADD CONSTRAINT "meeting_messages_meetingMessage_senderId_fkey" FOREIGN KEY ("meetingMessage_senderId") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meetingRecord_roomId_fkey" FOREIGN KEY ("meetingRecord_roomId") REFERENCES "meeting_rooms"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;
