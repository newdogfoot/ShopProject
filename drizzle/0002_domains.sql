CREATE TABLE "diagnoses" (
	"student_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"diagnosed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diagnoses_student_id_domain_pk" PRIMARY KEY("student_id","domain")
);
--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Keep existing diagnoses: until now every diagnosis covered "수와 연산" (NUM_OPS).
INSERT INTO "diagnoses" ("student_id", "domain", "diagnosed_at") SELECT "id", 'NUM_OPS', "diagnosed_at" FROM "students" WHERE "diagnosed_at" IS NOT NULL;--> statement-breakpoint
UPDATE "learning_sessions" SET "domain" = 'NUM_OPS' WHERE "kind" = 'diagnosis';--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "diagnosed_at";