CREATE TABLE "review_votes" (
	"submission_id" uuid NOT NULL,
	"device_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_votes_submission_id_device_hash_pk" PRIMARY KEY("submission_id","device_hash")
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "helpful_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;