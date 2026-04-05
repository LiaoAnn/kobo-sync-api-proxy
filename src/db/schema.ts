import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { v7 as uuid } from "uuid";

export const requests = pgTable("requests", {
	id: text("id").primaryKey().$default(uuid),
	method: text("method").notNull(),
	path: text("path").notNull(),
	requestHeaders: jsonb("request_headers")
		.$type<{ [key: string]: string }>()
		.notNull(),
	requestBody: jsonb("request_body").$type<unknown>().notNull(),
	responseStatus: integer("response_status").notNull(),
	responseHeaders: jsonb("response_headers")
		.$type<{ [key: string]: string }>()
		.notNull(),
	responseBody: jsonb("response_body").$type<unknown>().notNull(),
	createdAt: timestamp("created_at")
		.notNull()
		.$default(() => new Date()),
});
