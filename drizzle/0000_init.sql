CREATE TABLE "ai_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"ok" boolean NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid,
	"skill_id" text NOT NULL,
	"item_id" text NOT NULL,
	"purpose" text NOT NULL,
	"prompt" text NOT NULL,
	"answer" jsonb NOT NULL,
	"shown" text NOT NULL,
	"correct" boolean NOT NULL,
	"misconception_id" text,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"guardian_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "item_bank" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" text NOT NULL,
	"difficulty" integer NOT NULL,
	"theme" text NOT NULL,
	"source_item_id" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_bank_source_item_id_unique" UNIQUE("source_item_id")
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"state" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skill_states" (
	"student_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_states_student_id_skill_id_pk" PRIMARY KEY("student_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"grade" integer NOT NULL,
	"semester" integer NOT NULL,
	"theme" text DEFAULT 'snack' NOT NULL,
	"read_aloud" boolean DEFAULT false NOT NULL,
	"diagnosed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_states" ADD CONSTRAINT "skill_states_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_student_idx" ON "attempts" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_guardian_idx" ON "auth_sessions" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "consents_guardian_idx" ON "consents" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "item_bank_lookup_idx" ON "item_bank" USING btree ("skill_id","difficulty","theme");--> statement-breakpoint
CREATE INDEX "learning_sessions_student_idx" ON "learning_sessions" USING btree ("student_id","kind","status");--> statement-breakpoint
CREATE INDEX "students_guardian_idx" ON "students" USING btree ("guardian_id");