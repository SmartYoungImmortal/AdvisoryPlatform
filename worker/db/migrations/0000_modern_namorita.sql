CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempt" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"email" text NOT NULL,
	"ip_address" text,
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_application" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"legal_name" text,
	"phone" text,
	"birth_date" text,
	"bio" text,
	"id_document_upload_id" text,
	"skill_proof_upload_id" text,
	"reviewer_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_certificate" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"title" text NOT NULL,
	"issuer" text,
	"upload_id" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"verified_at" timestamp with time zone,
	"accepting_requests" boolean DEFAULT true NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_skill" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeslot" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"service_id" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"held_until" timestamp with time zone,
	"held_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"service_id" text,
	"advisor_id" text NOT NULL,
	"advisee_id" text NOT NULL,
	"timeslot_id" text,
	"status" text DEFAULT 'pending-payment' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_trial" boolean DEFAULT false NOT NULL,
	"jitsi_room" text,
	"joined_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"booking_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"advisor_share_minor" integer NOT NULL,
	"state" text DEFAULT 'held' NOT NULL,
	"held_at" timestamp with time zone DEFAULT now() NOT NULL,
	"releasable_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"refunded_amount_minor" integer,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"booking_id" text,
	"number" text NOT NULL,
	"payer_id" text NOT NULL,
	"status" text NOT NULL,
	"total_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"failure_reason" text,
	"refunded_amount_minor" integer,
	CONSTRAINT "invoice_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"invoice_id" text NOT NULL,
	"label" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"negative" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"booking_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"method" text NOT NULL,
	"omise_charge_id" text,
	"amount_minor" integer NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_method" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"omise_card_id" text NOT NULL,
	"brand" text DEFAULT 'unknown' NOT NULL,
	"last4" text NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"failure_reason" text,
	"omise_transfer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_account" (
	"advisor_id" text PRIMARY KEY NOT NULL,
	"bank_name" text NOT NULL,
	"account_last4" text NOT NULL,
	"account_name" text NOT NULL,
	"omise_recipient_id" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_action" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"body" text,
	"upload_id" text,
	"client_token" text,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_thread" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"booking_id" text,
	"advisor_id" text NOT NULL,
	"advisee_id" text NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_result" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"run_id" text NOT NULL,
	"advisor_id" text NOT NULL,
	"matched_on" text DEFAULT '' NOT NULL,
	"score_bp" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_run" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"topic" text NOT NULL,
	"budget_max_per_hour_minor" integer,
	"detail" text NOT NULL,
	"status" text DEFAULT 'searching' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_flag" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"message_id" text,
	"reason" text NOT NULL,
	"detector" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"excerpt" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"booking_id" text NOT NULL,
	"advisor_id" text NOT NULL,
	"author_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"reply_body" text,
	"reply_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_answer" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"request_id" text NOT NULL,
	"question_id" text,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_question" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"prompt" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_request" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"advisor_id" text NOT NULL,
	"advisee_id" text NOT NULL,
	"topic_label" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_note" text,
	"unread" boolean DEFAULT true NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"r2_key" text NOT NULL,
	"public_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_application" ADD CONSTRAINT "advisor_application_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_application" ADD CONSTRAINT "advisor_application_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_certificate" ADD CONSTRAINT "advisor_certificate_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_profile" ADD CONSTRAINT "advisor_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_skill" ADD CONSTRAINT "advisor_skill_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot" ADD CONSTRAINT "timeslot_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot" ADD CONSTRAINT "timeslot_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeslot" ADD CONSTRAINT "timeslot_held_by_user_id_fk" FOREIGN KEY ("held_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_advisee_id_user_id_fk" FOREIGN KEY ("advisee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_timeslot_id_timeslot_id_fk" FOREIGN KEY ("timeslot_id") REFERENCES "public"."timeslot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payer_id_user_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_action" ADD CONSTRAINT "admin_action_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_thread_id_chat_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_upload_id_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_advisor_id_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_advisee_id_user_id_fk" FOREIGN KEY ("advisee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result" ADD CONSTRAINT "match_result_run_id_match_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."match_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result" ADD CONSTRAINT "match_result_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_run" ADD CONSTRAINT "match_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_flag" ADD CONSTRAINT "policy_flag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_flag" ADD CONSTRAINT "policy_flag_message_id_chat_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_flag" ADD CONSTRAINT "policy_flag_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answer" ADD CONSTRAINT "screening_answer_request_id_screening_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."screening_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_answer" ADD CONSTRAINT "screening_answer_question_id_screening_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."screening_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_question" ADD CONSTRAINT "screening_question_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_request" ADD CONSTRAINT "screening_request_advisor_id_advisor_profile_user_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisor_profile"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_request" ADD CONSTRAINT "screening_request_advisee_id_user_id_fk" FOREIGN KEY ("advisee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_uidx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_attempt_email_time_idx" ON "login_attempt" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "advisor_application_user_idx" ON "advisor_application" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "advisor_application_status_idx" ON "advisor_application" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "advisor_certificate_advisor_idx" ON "advisor_certificate" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "advisor_profile_verified_idx" ON "advisor_profile" USING btree ("verified_at","accepting_requests");--> statement-breakpoint
CREATE INDEX "advisor_skill_advisor_idx" ON "advisor_skill" USING btree ("advisor_id","position");--> statement-breakpoint
CREATE INDEX "advisor_skill_name_idx" ON "advisor_skill" USING btree ("name");--> statement-breakpoint
CREATE INDEX "service_advisor_idx" ON "service" USING btree ("advisor_id","status");--> statement-breakpoint
CREATE INDEX "service_status_price_idx" ON "service" USING btree ("status","price_minor");--> statement-breakpoint
CREATE INDEX "timeslot_advisor_start_idx" ON "timeslot" USING btree ("advisor_id","start_at");--> statement-breakpoint
CREATE INDEX "timeslot_open_idx" ON "timeslot" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "booking_advisee_idx" ON "booking" USING btree ("advisee_id","start_at");--> statement-breakpoint
CREATE INDEX "booking_advisor_idx" ON "booking" USING btree ("advisor_id","start_at");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "booking" USING btree ("status","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_timeslot_uidx" ON "booking" USING btree ("timeslot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "escrow_booking_uidx" ON "escrow" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "escrow_release_idx" ON "escrow" USING btree ("state","releasable_at");--> statement-breakpoint
CREATE INDEX "invoice_payer_idx" ON "invoice" USING btree ("payer_id","issued_at");--> statement-breakpoint
CREATE INDEX "invoice_line_invoice_idx" ON "invoice_line" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "payment_booking_idx" ON "payment" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payment_payer_idx" ON "payment" USING btree ("payer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_idempotency_uidx" ON "payment" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_omise_charge_uidx" ON "payment" USING btree ("omise_charge_id");--> statement-breakpoint
CREATE INDEX "payment_method_user_idx" ON "payment_method" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_advisor_idx" ON "payout" USING btree ("advisor_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "admin_action_admin_idx" ON "admin_action" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_action_target_idx" ON "admin_action" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "chat_message_thread_idx" ON "chat_message" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_client_token_uidx" ON "chat_message" USING btree ("thread_id","client_token");--> statement-breakpoint
CREATE INDEX "chat_thread_advisor_idx" ON "chat_thread" USING btree ("advisor_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_thread_advisee_idx" ON "chat_thread" USING btree ("advisee_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_thread_pair_uidx" ON "chat_thread" USING btree ("advisor_id","advisee_id","booking_id");--> statement-breakpoint
CREATE INDEX "match_result_run_idx" ON "match_result" USING btree ("run_id","position");--> statement-breakpoint
CREATE INDEX "match_run_user_idx" ON "match_run" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_unread_idx" ON "notification" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "policy_flag_user_idx" ON "policy_flag" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "policy_flag_open_idx" ON "policy_flag" USING btree ("resolved_at","severity");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "review_booking_uidx" ON "review" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "review_advisor_idx" ON "review" USING btree ("advisor_id","created_at");--> statement-breakpoint
CREATE INDEX "screening_answer_request_idx" ON "screening_answer" USING btree ("request_id","position");--> statement-breakpoint
CREATE INDEX "screening_question_advisor_idx" ON "screening_question" USING btree ("advisor_id","position");--> statement-breakpoint
CREATE INDEX "screening_request_advisor_idx" ON "screening_request" USING btree ("advisor_id","status","created_at");--> statement-breakpoint
CREATE INDEX "screening_request_advisee_idx" ON "screening_request" USING btree ("advisee_id","created_at");--> statement-breakpoint
CREATE INDEX "upload_user_idx" ON "upload" USING btree ("user_id","created_at");
-- Timeslot no-overlap. "Timeslot management (no-overlap)" is a core requirement
-- and application code cannot honour it: two advisees reaching checkout in the
-- same second both read an open slot and both write. Only the database can
-- settle that, so the guarantee lives here as an exclusion constraint.
--
-- btree_gist is what lets a plain equality column (advisor_id) sit in a GiST
-- index alongside a range. Cancelled slots are excluded so a cancellation frees
-- the window for re-listing.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "timeslot" ADD CONSTRAINT "timeslot_no_overlap"
  EXCLUDE USING gist (
    "advisor_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  ) WHERE (status <> 'cancelled');
