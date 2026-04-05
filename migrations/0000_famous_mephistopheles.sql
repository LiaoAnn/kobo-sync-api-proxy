CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"request_headers" jsonb NOT NULL,
	"request_body" jsonb NOT NULL,
	"response_status" integer NOT NULL,
	"response_headers" jsonb NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
