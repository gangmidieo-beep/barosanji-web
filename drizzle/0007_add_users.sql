CREATE TABLE "users" (
	"kakao_id" text PRIMARY KEY NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"receiver_name" text DEFAULT '' NOT NULL,
	"receiver_address" text DEFAULT '' NOT NULL,
	"receiver_address_detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp DEFAULT now() NOT NULL
);
