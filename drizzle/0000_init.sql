CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"industry" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"device_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_title" text NOT NULL,
	"title_normalized" text NOT NULL,
	"monthly_salary_etb" integer NOT NULL,
	"bonus_etb" integer,
	"experience_years" smallint NOT NULL,
	"employment_type" text,
	"city" text,
	"still_employed" boolean DEFAULT true NOT NULL,
	"rating" smallint,
	"review_pros" text,
	"review_cons" text,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"device_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salary_range" CHECK ("submissions"."monthly_salary_etb" between 500 and 2000000),
	CONSTRAINT "experience_range" CHECK ("submissions"."experience_years" between 0 and 50),
	CONSTRAINT "rating_range" CHECK ("submissions"."rating" between 1 and 5),
	CONSTRAINT "pros_length" CHECK (char_length("submissions"."review_pros") <= 1000),
	CONSTRAINT "cons_length" CHECK (char_length("submissions"."review_cons") <= 1000),
	CONSTRAINT "status_values" CHECK ("submissions"."status" in ('published','flagged','removed')),
	CONSTRAINT "employment_type_values" CHECK ("submissions"."employment_type" in ('full_time','part_time','contract','intern'))
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_submission_idx" ON "reports" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submissions_company_idx" ON "submissions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "submissions_title_idx" ON "submissions" USING btree ("title_normalized","status");--> statement-breakpoint
CREATE INDEX "submissions_device_idx" ON "submissions" USING btree ("device_hash","created_at");