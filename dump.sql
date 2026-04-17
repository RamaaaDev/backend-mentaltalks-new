--
-- PostgreSQL database dump
--

\restrict MhduDvcQ8HQuwh8h1coKGIz8QBKJnYjfCgultMNwFXECYaKZJTXL6UgTVHAY7OK

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: tegar
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO tegar;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: tegar
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ArticleCategory; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."ArticleCategory" AS ENUM (
    'KONSULTASI',
    'EDUKASI',
    'MEDITASI'
);


ALTER TYPE public."ArticleCategory" OWNER TO tegar;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'PROGRESS',
    'DONE'
);


ALTER TYPE public."BookingStatus" OWNER TO tegar;

--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."DiscountType" AS ENUM (
    'FIXED',
    'PERCENTAGE'
);


ALTER TYPE public."DiscountType" OWNER TO tegar;

--
-- Name: MeetingStatus; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."MeetingStatus" AS ENUM (
    'SCHEDULED',
    'LIVE',
    'ENDED',
    'CANCELED'
);


ALTER TYPE public."MeetingStatus" OWNER TO tegar;

--
-- Name: MeetingType; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."MeetingType" AS ENUM (
    'CHAT',
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE public."MeetingType" OWNER TO tegar;

--
-- Name: NotificationReferenceType; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."NotificationReferenceType" AS ENUM (
    'BOOKINGID',
    'MEETINGID'
);


ALTER TYPE public."NotificationReferenceType" OWNER TO tegar;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."NotificationType" AS ENUM (
    'BOOKING',
    'PAYMENT',
    'MEETING'
);


ALTER TYPE public."NotificationType" OWNER TO tegar;

--
-- Name: OtpType; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."OtpType" AS ENUM (
    'REGISTER',
    'FORGOT_PASSWORD'
);


ALTER TYPE public."OtpType" OWNER TO tegar;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: tegar
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN',
    'PSYCHOLOGIST'
);


ALTER TYPE public."Role" OWNER TO tegar;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO tegar;

--
-- Name: admin_profiles; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.admin_profiles (
    admin_id text NOT NULL,
    "admin_userId" text NOT NULL,
    admin_specialty text NOT NULL
);


ALTER TABLE public.admin_profiles OWNER TO tegar;

--
-- Name: article; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.article (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text NOT NULL,
    category public."ArticleCategory" NOT NULL,
    tags text[],
    featured boolean DEFAULT false NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.article OWNER TO tegar;

--
-- Name: booking_psychologist; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.booking_psychologist (
    booking_id text NOT NULL,
    "booking_userId" text NOT NULL,
    "booking_psychologistId" text NOT NULL,
    "booking_scheduleId" text NOT NULL,
    "booking_couponId" text,
    booking_status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    booking_type public."MeetingType" NOT NULL,
    booking_notes text,
    "booking_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "booking_updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.booking_psychologist OWNER TO tegar;

--
-- Name: coupon; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.coupon (
    coupon_id text NOT NULL,
    coupon_code text NOT NULL,
    coupon_value integer NOT NULL,
    "coupon_maxDiscount" integer,
    "coupon_minPurchase" integer,
    "coupon_usageLimit" integer,
    "coupon_usedCount" integer DEFAULT 0 NOT NULL,
    "coupon_expiresAt" timestamp(3) without time zone NOT NULL,
    "coupon_isActive" boolean DEFAULT true NOT NULL,
    "coupon_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    coupon_type public."DiscountType" NOT NULL
);


ALTER TABLE public.coupon OWNER TO tegar;

--
-- Name: coupon_usage; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.coupon_usage (
    "couponUsage_id" text NOT NULL,
    "couponUsage_couponId" text NOT NULL,
    "couponUsage_userId" text NOT NULL,
    "couponUsage_usedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.coupon_usage OWNER TO tegar;

--
-- Name: location_office; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.location_office (
    location_id text NOT NULL,
    location_name text NOT NULL,
    location_address text NOT NULL,
    "location_addressDetail" text NOT NULL,
    location_photos text[],
    "location_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "location_updateAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.location_office OWNER TO tegar;

--
-- Name: meeting_messages; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.meeting_messages (
    "meetingMessage_id" text NOT NULL,
    "meetingMessage_roomId" text NOT NULL,
    "meetingMessage_senderId" text NOT NULL,
    "meetingMessage_content" text NOT NULL,
    "meetingMessage_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.meeting_messages OWNER TO tegar;

--
-- Name: meeting_recordings; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.meeting_recordings (
    "meetingRecord_id" text NOT NULL,
    "meetingRecord_roomId" text NOT NULL,
    "meetingRecord_fileUrl" text NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "meetingRecord_endedAt" timestamp(3) without time zone NOT NULL,
    "meetingRecord_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.meeting_recordings OWNER TO tegar;

--
-- Name: meeting_rooms; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.meeting_rooms (
    meeting_id text NOT NULL,
    booking_id text NOT NULL,
    "meeting_hostId" text NOT NULL,
    "meeting_participantId" text NOT NULL,
    "meeting_scheduleAt" timestamp(3) without time zone NOT NULL,
    "meeting_startedAt" timestamp(3) without time zone,
    "meeting_endedAt" timestamp(3) without time zone,
    meeting_status public."MeetingStatus" DEFAULT 'SCHEDULED'::public."MeetingStatus" NOT NULL,
    "meeting_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "meeting_updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.meeting_rooms OWNER TO tegar;

--
-- Name: notification; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.notification (
    notification_id text NOT NULL,
    "notification_userId" text NOT NULL,
    notification_title text NOT NULL,
    notification_body text NOT NULL,
    "notification_isRead" boolean DEFAULT false NOT NULL,
    notification_type public."NotificationType" NOT NULL,
    "notification_referenceId" public."NotificationReferenceType" NOT NULL,
    "notification_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notification OWNER TO tegar;

--
-- Name: otp; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.otp (
    otp_code text NOT NULL,
    "otp_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "otp_expiredAt" timestamp(3) without time zone NOT NULL,
    otp_id text NOT NULL,
    "otp_userId" text NOT NULL,
    otp_type public."OtpType" NOT NULL
);


ALTER TABLE public.otp OWNER TO tegar;

--
-- Name: payment; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.payment (
    id text NOT NULL,
    "bookingId" text,
    "orderId" text NOT NULL,
    token text NOT NULL,
    "redirectUrl" text NOT NULL,
    status text NOT NULL,
    "grossAmount" integer NOT NULL,
    "paymentType" text,
    "transactionId" text,
    "transactionTime" timestamp(3) without time zone,
    "fraudStatus" text,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payment OWNER TO tegar;

--
-- Name: psychologist_profiles; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.psychologist_profiles (
    psychologist_id text NOT NULL,
    "psychologist_userId" text NOT NULL,
    psychologist_name text NOT NULL,
    psychologist_education text[],
    psychologist_bio text NOT NULL,
    psychologist_quotes text,
    psychologist_specialties text[],
    "psychologist_yearsExperience" integer NOT NULL,
    psychologist_rating double precision DEFAULT 0 NOT NULL,
    "psychologist_ratingsCount" integer DEFAULT 0 NOT NULL,
    "psychologist_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "psychologist_updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.psychologist_profiles OWNER TO tegar;

--
-- Name: reviews_office; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.reviews_office (
    "reviewOffice_id" text NOT NULL,
    "reviewOffice_userId" text NOT NULL,
    "reviewOffice_locationId" text NOT NULL,
    "reviewOffice_bookingId" text,
    "reviewOffice_rating" integer NOT NULL,
    "reviewOffice_comment" text,
    "reviewOffice_photos" text[],
    "reviewOffice_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewOffice_updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reviews_office OWNER TO tegar;

--
-- Name: reviews_psikolog; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.reviews_psikolog (
    "reviewPsikolog_id" text NOT NULL,
    "reviewPsikolog_userId" text NOT NULL,
    "reviewPsikolog_psychologistId" text NOT NULL,
    "reviewPsikolog_bookingId" text,
    "reviewPsikolog_rating" integer NOT NULL,
    "reviewPsikolog_comment" text,
    "reviewPsikolog_isVerified" boolean DEFAULT false NOT NULL,
    "reviewPsikolog_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewPsikolog_updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reviews_psikolog OWNER TO tegar;

--
-- Name: schedules; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.schedules (
    schedule_id text NOT NULL,
    "schedule_psychologistId" text NOT NULL,
    "schedule_startTime" timestamp(3) without time zone NOT NULL,
    "schedule_endTime" timestamp(3) without time zone NOT NULL,
    "schedule_locationId" text,
    schedule_price integer NOT NULL,
    schedule_type public."MeetingType" NOT NULL
);


ALTER TABLE public.schedules OWNER TO tegar;

--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public.testimonials (
    testimonial_id text NOT NULL,
    "testimonial_userId" text NOT NULL,
    testimonial_rating double precision NOT NULL,
    testimonial_comment text NOT NULL
);


ALTER TABLE public.testimonials OWNER TO tegar;

--
-- Name: user; Type: TABLE; Schema: public; Owner: tegar
--

CREATE TABLE public."user" (
    user_id text NOT NULL,
    user_username text NOT NULL,
    user_name text,
    user_email text,
    user_phone text,
    user_role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    user_birthday timestamp(3) without time zone,
    "user_createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "user_updatedAt" timestamp(3) without time zone NOT NULL,
    "user_isActive" boolean DEFAULT false NOT NULL,
    user_photos text,
    "user_passwordHash" text,
    "user_refreshToken" text,
    "isVerified" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."user" OWNER TO tegar;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
941d16bd-0a1a-4c58-8101-93a387a367f9	94a2f8e43644848e985fc03446ee9ece7f70bea9d5e1c620857814dfb52533a6	2026-04-10 21:35:08.566849+00	20260410213508_init	\N	\N	2026-04-10 21:35:08.375628+00	1
db325c3d-fd62-45ed-a02a-19c169342c00	839c6089dd73d3ae3196b4614e8e82486dbdc6867edc66e25789a5b840f56685	2026-04-12 11:49:23.164484+00	20260412114919_change_name_otp_schema	\N	\N	2026-04-12 11:49:19.984514+00	1
8643f2be-e1fe-47e6-949a-b1954ded8159	b348a9ccb938ac4f100c79d81b34cda359008cfb327e10fb3bd378497c612169	2026-04-12 12:05:55.683197+00	20260412120555_added_otp_type	\N	\N	2026-04-12 12:05:55.613663+00	1
60599c8f-94e5-41a4-b834-b68a8d4a2434	7d129a040775e45b2b5708b219b3100509a700046c1f88a64f137dbd9456b609	2026-04-13 10:26:15.122834+00	20260413102615_update_name_role_psychologist	\N	\N	2026-04-13 10:26:15.079476+00	1
c175195f-a98f-4b04-accf-fd6d7914fb54	e77b8254a5e331925e7c1169555d5ea5f56b53ad942bf3fa68f4b3e93873e8cc	2026-04-14 14:06:42.281472+00	20260414140642_added_for_v4_file	\N	\N	2026-04-14 14:06:42.214282+00	1
\.


--
-- Data for Name: admin_profiles; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.admin_profiles (admin_id, "admin_userId", admin_specialty) FROM stdin;
c7fc56ef-c2c6-48ad-86e9-c98246935a72	c7fc56ef-c2c6-48ad-86e9-c98246935a72	System Administrator
\.


--
-- Data for Name: article; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.article (id, title, slug, excerpt, content, category, tags, featured, views, likes, "publishedAt", "authorId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: booking_psychologist; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.booking_psychologist (booking_id, "booking_userId", "booking_psychologistId", "booking_scheduleId", "booking_couponId", booking_status, booking_type, booking_notes, "booking_createdAt", "booking_updatedAt") FROM stdin;
b4a1fa99-71ce-48e9-b81f-9db1e8e4cff4	03679fa3-308d-4674-88fa-120446974dac	387781e3-f242-473c-acf5-3cbb95dc219e	309bbf2f-915d-4155-9bd2-097a638a1707	\N	PENDING	ONLINE	\N	2026-04-16 14:46:58.567	2026-04-16 14:46:58.567
\.


--
-- Data for Name: coupon; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.coupon (coupon_id, coupon_code, coupon_value, "coupon_maxDiscount", "coupon_minPurchase", "coupon_usageLimit", "coupon_usedCount", "coupon_expiresAt", "coupon_isActive", "coupon_createdAt", coupon_type) FROM stdin;
\.


--
-- Data for Name: coupon_usage; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.coupon_usage ("couponUsage_id", "couponUsage_couponId", "couponUsage_userId", "couponUsage_usedAt") FROM stdin;
\.


--
-- Data for Name: location_office; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.location_office (location_id, location_name, location_address, "location_addressDetail", location_photos, "location_createdAt", "location_updateAt") FROM stdin;
\.


--
-- Data for Name: meeting_messages; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.meeting_messages ("meetingMessage_id", "meetingMessage_roomId", "meetingMessage_senderId", "meetingMessage_content", "meetingMessage_createdAt") FROM stdin;
\.


--
-- Data for Name: meeting_recordings; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.meeting_recordings ("meetingRecord_id", "meetingRecord_roomId", "meetingRecord_fileUrl", "startedAt", "meetingRecord_endedAt", "meetingRecord_createdAt") FROM stdin;
\.


--
-- Data for Name: meeting_rooms; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.meeting_rooms (meeting_id, booking_id, "meeting_hostId", "meeting_participantId", "meeting_scheduleAt", "meeting_startedAt", "meeting_endedAt", meeting_status, "meeting_createdAt", "meeting_updatedAt") FROM stdin;
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.notification (notification_id, "notification_userId", notification_title, notification_body, "notification_isRead", notification_type, "notification_referenceId", "notification_createdAt") FROM stdin;
\.


--
-- Data for Name: otp; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.otp (otp_code, "otp_createdAt", "otp_expiredAt", otp_id, "otp_userId", otp_type) FROM stdin;
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.payment (id, "bookingId", "orderId", token, "redirectUrl", status, "grossAmount", "paymentType", "transactionId", "transactionTime", "fraudStatus", meta, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: psychologist_profiles; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.psychologist_profiles (psychologist_id, "psychologist_userId", psychologist_name, psychologist_education, psychologist_bio, psychologist_quotes, psychologist_specialties, "psychologist_yearsExperience", psychologist_rating, "psychologist_ratingsCount", "psychologist_createdAt", "psychologist_updatedAt") FROM stdin;
387781e3-f242-473c-acf5-3cbb95dc219e	3abe20b7-9863-47c9-b7b1-d8c4b2ad3362	Aisyah Ratnaningtyas, M.Psi., Psikolog	{}	Psikolog bimbingan karir yang membantu individu menemukan arah dan potensi terbaik dalam dunia kerja.	Setiap langkah kecil tetap membawa kamu lebih dekat pada tujuan besarmu.	{"Bimbingan Karir"}	5	0	0	2026-04-16 05:50:20.323	2026-04-16 05:50:20.323
\.


--
-- Data for Name: reviews_office; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.reviews_office ("reviewOffice_id", "reviewOffice_userId", "reviewOffice_locationId", "reviewOffice_bookingId", "reviewOffice_rating", "reviewOffice_comment", "reviewOffice_photos", "reviewOffice_createdAt", "reviewOffice_updatedAt") FROM stdin;
\.


--
-- Data for Name: reviews_psikolog; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.reviews_psikolog ("reviewPsikolog_id", "reviewPsikolog_userId", "reviewPsikolog_psychologistId", "reviewPsikolog_bookingId", "reviewPsikolog_rating", "reviewPsikolog_comment", "reviewPsikolog_isVerified", "reviewPsikolog_createdAt", "reviewPsikolog_updatedAt") FROM stdin;
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.schedules (schedule_id, "schedule_psychologistId", "schedule_startTime", "schedule_endTime", "schedule_locationId", schedule_price, schedule_type) FROM stdin;
309bbf2f-915d-4155-9bd2-097a638a1707	387781e3-f242-473c-acf5-3cbb95dc219e	2026-04-17 02:00:00	2026-04-17 03:00:00	\N	1000	ONLINE
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public.testimonials (testimonial_id, "testimonial_userId", testimonial_rating, testimonial_comment) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: tegar
--

COPY public."user" (user_id, user_username, user_name, user_email, user_phone, user_role, user_birthday, "user_createdAt", "user_updatedAt", "user_isActive", user_photos, "user_passwordHash", "user_refreshToken", "isVerified") FROM stdin;
c7fc56ef-c2c6-48ad-86e9-c98246935a72	admin	admin	ramadhantegar731@gmail.com	085156885768	ADMIN	\N	2026-04-12 20:12:08.915	2026-04-13 21:00:25.046	t	\N	$2b$12$6wAh0wRUUzcfNe4YVBzUceJPB.TQuxCjRbQvHTkiBxQlRhsMeveMC	$2b$10$6tKqwo1HTSKATRXAPpwSH.g0KSStqHPlJosGXgJKispRDrtLv.ETe	t
3abe20b7-9863-47c9-b7b1-d8c4b2ad3362	psikolog	psikolog	tegarramadhan1101@gmail.com	081234567891	PSYCHOLOGIST	\N	2026-04-13 10:33:13.936	2026-04-16 05:06:51.118	t	\N	$2b$12$QzriDkzQDRrk4SMDXsjkvuax6FgL4aEY6yyvl4n0y6Fz.jvxoCxq2	$2b$10$EdXl0Gj2.RxS/iQ4zq8jZOu1wRGoixNPVWWJwttQ1GuJ4PvyhyL1W	t
03679fa3-308d-4674-88fa-120446974dac	User123	user123	kageherpi@gmail.com	081277886789	USER	\N	2026-04-16 05:00:47.09	2026-04-16 06:35:29.263	t	\N	$2b$12$PqPJxgFfRGQAg1xiRwHC0OdhOkT169/3gwO.c9DWgrWQzHinPxVkm	$2b$10$.rXr2zJt/w8Ltw8X/qMMO.KRI3lXm9v0oxFke4z0FKwT0IdW52GRS	t
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_profiles admin_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.admin_profiles
    ADD CONSTRAINT admin_profiles_pkey PRIMARY KEY (admin_id);


--
-- Name: article article_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.article
    ADD CONSTRAINT article_pkey PRIMARY KEY (id);


--
-- Name: booking_psychologist booking_psychologist_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.booking_psychologist
    ADD CONSTRAINT booking_psychologist_pkey PRIMARY KEY (booking_id);


--
-- Name: coupon coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.coupon
    ADD CONSTRAINT coupon_pkey PRIMARY KEY (coupon_id);


--
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY ("couponUsage_id");


--
-- Name: location_office location_office_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.location_office
    ADD CONSTRAINT location_office_pkey PRIMARY KEY (location_id);


--
-- Name: meeting_messages meeting_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_messages
    ADD CONSTRAINT meeting_messages_pkey PRIMARY KEY ("meetingMessage_id");


--
-- Name: meeting_recordings meeting_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_recordings
    ADD CONSTRAINT meeting_recordings_pkey PRIMARY KEY ("meetingRecord_id");


--
-- Name: meeting_rooms meeting_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (meeting_id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (notification_id);


--
-- Name: otp otp_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.otp
    ADD CONSTRAINT otp_pkey PRIMARY KEY (otp_id);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);


--
-- Name: psychologist_profiles psychologist_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.psychologist_profiles
    ADD CONSTRAINT psychologist_profiles_pkey PRIMARY KEY (psychologist_id);


--
-- Name: reviews_office reviews_office_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_office
    ADD CONSTRAINT reviews_office_pkey PRIMARY KEY ("reviewOffice_id");


--
-- Name: reviews_psikolog reviews_psikolog_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_psikolog
    ADD CONSTRAINT reviews_psikolog_pkey PRIMARY KEY ("reviewPsikolog_id");


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (schedule_id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (testimonial_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: admin_profiles_admin_userId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "admin_profiles_admin_userId_key" ON public.admin_profiles USING btree ("admin_userId");


--
-- Name: article_slug_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX article_slug_key ON public.article USING btree (slug);


--
-- Name: booking_psychologist_booking_psychologistId_booking_status_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "booking_psychologist_booking_psychologistId_booking_status_idx" ON public.booking_psychologist USING btree ("booking_psychologistId", booking_status);


--
-- Name: booking_psychologist_booking_scheduleId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "booking_psychologist_booking_scheduleId_key" ON public.booking_psychologist USING btree ("booking_scheduleId");


--
-- Name: booking_psychologist_booking_userId_booking_status_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "booking_psychologist_booking_userId_booking_status_idx" ON public.booking_psychologist USING btree ("booking_userId", booking_status);


--
-- Name: coupon_coupon_code_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX coupon_coupon_code_key ON public.coupon USING btree (coupon_code);


--
-- Name: coupon_usage_couponUsage_couponId_couponUsage_userId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "coupon_usage_couponUsage_couponId_couponUsage_userId_key" ON public.coupon_usage USING btree ("couponUsage_couponId", "couponUsage_userId");


--
-- Name: meeting_messages_meetingMessage_roomId_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "meeting_messages_meetingMessage_roomId_idx" ON public.meeting_messages USING btree ("meetingMessage_roomId");


--
-- Name: meeting_messages_meetingMessage_senderId_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "meeting_messages_meetingMessage_senderId_idx" ON public.meeting_messages USING btree ("meetingMessage_senderId");


--
-- Name: meeting_recordings_meetingRecord_roomId_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "meeting_recordings_meetingRecord_roomId_idx" ON public.meeting_recordings USING btree ("meetingRecord_roomId");


--
-- Name: meeting_rooms_booking_id_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX meeting_rooms_booking_id_key ON public.meeting_rooms USING btree (booking_id);


--
-- Name: meeting_rooms_meeting_hostId_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "meeting_rooms_meeting_hostId_idx" ON public.meeting_rooms USING btree ("meeting_hostId");


--
-- Name: meeting_rooms_meeting_id_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX meeting_rooms_meeting_id_key ON public.meeting_rooms USING btree (meeting_id);


--
-- Name: meeting_rooms_meeting_participantId_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "meeting_rooms_meeting_participantId_idx" ON public.meeting_rooms USING btree ("meeting_participantId");


--
-- Name: otp_otp_userId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "otp_otp_userId_key" ON public.otp USING btree ("otp_userId");


--
-- Name: payment_bookingId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "payment_bookingId_key" ON public.payment USING btree ("bookingId");


--
-- Name: payment_orderId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "payment_orderId_key" ON public.payment USING btree ("orderId");


--
-- Name: psychologist_profiles_psychologist_specialties_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX psychologist_profiles_psychologist_specialties_idx ON public.psychologist_profiles USING btree (psychologist_specialties);


--
-- Name: psychologist_profiles_psychologist_userId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "psychologist_profiles_psychologist_userId_key" ON public.psychologist_profiles USING btree ("psychologist_userId");


--
-- Name: reviews_office_reviewOffice_bookingId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "reviews_office_reviewOffice_bookingId_key" ON public.reviews_office USING btree ("reviewOffice_bookingId");


--
-- Name: reviews_office_reviewOffice_locationId_reviewOffice_rating_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "reviews_office_reviewOffice_locationId_reviewOffice_rating_idx" ON public.reviews_office USING btree ("reviewOffice_locationId", "reviewOffice_rating");


--
-- Name: reviews_office_reviewOffice_userId_reviewOffice_locationId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "reviews_office_reviewOffice_userId_reviewOffice_locationId_key" ON public.reviews_office USING btree ("reviewOffice_userId", "reviewOffice_locationId");


--
-- Name: reviews_psikolog_reviewPsikolog_bookingId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "reviews_psikolog_reviewPsikolog_bookingId_key" ON public.reviews_psikolog USING btree ("reviewPsikolog_bookingId");


--
-- Name: reviews_psikolog_reviewPsikolog_psychologistId_reviewPsikol_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "reviews_psikolog_reviewPsikolog_psychologistId_reviewPsikol_idx" ON public.reviews_psikolog USING btree ("reviewPsikolog_psychologistId", "reviewPsikolog_rating");


--
-- Name: reviews_psikolog_reviewPsikolog_userId_reviewPsikolog_psych_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "reviews_psikolog_reviewPsikolog_userId_reviewPsikolog_psych_key" ON public.reviews_psikolog USING btree ("reviewPsikolog_userId", "reviewPsikolog_psychologistId");


--
-- Name: schedules_schedule_psychologistId_schedule_startTime_schedu_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX "schedules_schedule_psychologistId_schedule_startTime_schedu_idx" ON public.schedules USING btree ("schedule_psychologistId", "schedule_startTime", schedule_type, "schedule_locationId");


--
-- Name: testimonials_testimonial_userId_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX "testimonials_testimonial_userId_key" ON public.testimonials USING btree ("testimonial_userId");


--
-- Name: user_user_role_idx; Type: INDEX; Schema: public; Owner: tegar
--

CREATE INDEX user_user_role_idx ON public."user" USING btree (user_role);


--
-- Name: user_user_username_key; Type: INDEX; Schema: public; Owner: tegar
--

CREATE UNIQUE INDEX user_user_username_key ON public."user" USING btree (user_username);


--
-- Name: admin_profiles admin_profiles_admin_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.admin_profiles
    ADD CONSTRAINT "admin_profiles_admin_userId_fkey" FOREIGN KEY ("admin_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: article article_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.article
    ADD CONSTRAINT "article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.psychologist_profiles(psychologist_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: booking_psychologist booking_psychologist_booking_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.booking_psychologist
    ADD CONSTRAINT "booking_psychologist_booking_couponId_fkey" FOREIGN KEY ("booking_couponId") REFERENCES public.coupon(coupon_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: booking_psychologist booking_psychologist_booking_psychologistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.booking_psychologist
    ADD CONSTRAINT "booking_psychologist_booking_psychologistId_fkey" FOREIGN KEY ("booking_psychologistId") REFERENCES public.psychologist_profiles(psychologist_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: booking_psychologist booking_psychologist_booking_scheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.booking_psychologist
    ADD CONSTRAINT "booking_psychologist_booking_scheduleId_fkey" FOREIGN KEY ("booking_scheduleId") REFERENCES public.schedules(schedule_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: booking_psychologist booking_psychologist_booking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.booking_psychologist
    ADD CONSTRAINT "booking_psychologist_booking_userId_fkey" FOREIGN KEY ("booking_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_couponUsage_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT "coupon_usage_couponUsage_couponId_fkey" FOREIGN KEY ("couponUsage_couponId") REFERENCES public.coupon(coupon_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: coupon_usage coupon_usage_couponUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT "coupon_usage_couponUsage_userId_fkey" FOREIGN KEY ("couponUsage_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: meeting_messages meeting_messages_meetingMessage_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_messages
    ADD CONSTRAINT "meeting_messages_meetingMessage_roomId_fkey" FOREIGN KEY ("meetingMessage_roomId") REFERENCES public.meeting_rooms(meeting_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: meeting_messages meeting_messages_meetingMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_messages
    ADD CONSTRAINT "meeting_messages_meetingMessage_senderId_fkey" FOREIGN KEY ("meetingMessage_senderId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: meeting_recordings meeting_recordings_meetingRecord_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_recordings
    ADD CONSTRAINT "meeting_recordings_meetingRecord_roomId_fkey" FOREIGN KEY ("meetingRecord_roomId") REFERENCES public.meeting_rooms(meeting_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: meeting_rooms meeting_rooms_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking_psychologist(booking_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: meeting_rooms meeting_rooms_meeting_hostId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT "meeting_rooms_meeting_hostId_fkey" FOREIGN KEY ("meeting_hostId") REFERENCES public.psychologist_profiles(psychologist_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: meeting_rooms meeting_rooms_meeting_participantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT "meeting_rooms_meeting_participantId_fkey" FOREIGN KEY ("meeting_participantId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notification notification_notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT "notification_notification_userId_fkey" FOREIGN KEY ("notification_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: otp otp_otp_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.otp
    ADD CONSTRAINT "otp_otp_userId_fkey" FOREIGN KEY ("otp_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payment payment_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public.booking_psychologist(booking_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: psychologist_profiles psychologist_profiles_psychologist_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.psychologist_profiles
    ADD CONSTRAINT "psychologist_profiles_psychologist_userId_fkey" FOREIGN KEY ("psychologist_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reviews_office reviews_office_reviewOffice_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_office
    ADD CONSTRAINT "reviews_office_reviewOffice_bookingId_fkey" FOREIGN KEY ("reviewOffice_bookingId") REFERENCES public.booking_psychologist(booking_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviews_office reviews_office_reviewOffice_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_office
    ADD CONSTRAINT "reviews_office_reviewOffice_locationId_fkey" FOREIGN KEY ("reviewOffice_locationId") REFERENCES public.location_office(location_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews_office reviews_office_reviewOffice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_office
    ADD CONSTRAINT "reviews_office_reviewOffice_userId_fkey" FOREIGN KEY ("reviewOffice_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews_psikolog reviews_psikolog_reviewPsikolog_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_psikolog
    ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_bookingId_fkey" FOREIGN KEY ("reviewPsikolog_bookingId") REFERENCES public.booking_psychologist(booking_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviews_psikolog reviews_psikolog_reviewPsikolog_psychologistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_psikolog
    ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_psychologistId_fkey" FOREIGN KEY ("reviewPsikolog_psychologistId") REFERENCES public.psychologist_profiles(psychologist_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews_psikolog reviews_psikolog_reviewPsikolog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.reviews_psikolog
    ADD CONSTRAINT "reviews_psikolog_reviewPsikolog_userId_fkey" FOREIGN KEY ("reviewPsikolog_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: schedules schedules_schedule_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "schedules_schedule_locationId_fkey" FOREIGN KEY ("schedule_locationId") REFERENCES public.location_office(location_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: schedules schedules_schedule_psychologistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "schedules_schedule_psychologistId_fkey" FOREIGN KEY ("schedule_psychologistId") REFERENCES public.psychologist_profiles(psychologist_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: testimonials testimonials_testimonial_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tegar
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT "testimonials_testimonial_userId_fkey" FOREIGN KEY ("testimonial_userId") REFERENCES public."user"(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: tegar
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict MhduDvcQ8HQuwh8h1coKGIz8QBKJnYjfCgultMNwFXECYaKZJTXL6UgTVHAY7OK

