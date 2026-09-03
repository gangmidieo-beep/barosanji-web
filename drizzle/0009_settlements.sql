CREATE TABLE "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"bank_account" text DEFAULT '' NOT NULL,
	"bank_holder" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
