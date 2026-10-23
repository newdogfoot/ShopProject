CREATE TABLE "explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"reason_id" text NOT NULL,
	"prompt" text NOT NULL,
	"text" text NOT NULL,
	"score" integer,
	"confidence" text,
	"feedback" text NOT NULL,
	"guardian_verdict" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "error_type" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "solved_after_retry" boolean;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "allow_writing" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "explanations_student_idx" ON "explanations" USING btree ("student_id","created_at");