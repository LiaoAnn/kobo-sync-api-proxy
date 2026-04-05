import "dotenv/config";
import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Hono } from "hono";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

type LoggedBody =
	| { type: "empty" }
	| { type: "json"; value: unknown }
	| { type: "form"; value: Record<string, unknown> }
	| { type: "text"; contentType: string; value: string }
	| {
			type: "binary";
			contentType: string;
			encoding: "base64";
			value: string;
	  };

const isJsonContentType = (contentType: string): boolean =>
	contentType.includes("application/json") || contentType.includes("+json");

const isFormContentType = (contentType: string): boolean =>
	contentType.includes("multipart/form-data") ||
	contentType.includes("application/x-www-form-urlencoded");

const isTextContentType = (contentType: string): boolean =>
	contentType.startsWith("text/") ||
	contentType.includes("application/xml") ||
	contentType.includes("application/xhtml+xml") ||
	contentType.includes("application/javascript") ||
	contentType.includes("application/x-javascript") ||
	contentType.includes("application/ecmascript") ||
	contentType.includes("image/svg+xml");

const appendFormValue = (
	target: Record<string, unknown>,
	key: string,
	value: unknown,
): void => {
	const existing = target[key];

	if (existing === undefined) {
		target[key] = value;
		return;
	}

	if (Array.isArray(existing)) {
		existing.push(value);
		return;
	}

	target[key] = [existing, value];
};

const serializeFormValue = async (
	value: FormDataEntryValue,
): Promise<unknown> => {
	if (typeof value === "string") {
		return value;
	}

	const buffer = Buffer.from(await value.arrayBuffer());
	return {
		kind: "file",
		name: value.name,
		contentType: value.type || "application/octet-stream",
		size: value.size,
		encoding: "base64",
		data: buffer.toString("base64"),
	};
};

const serializeBody = async (
	payload: Request | Response,
): Promise<LoggedBody> => {
	if (!payload.body) {
		return { type: "empty" };
	}

	const contentType = (payload.headers.get("content-type") ?? "").toLowerCase();

	if (isFormContentType(contentType)) {
		const formData = await payload.formData();
		const form: Record<string, unknown> = {};

		for (const [key, value] of formData.entries()) {
			appendFormValue(form, key, await serializeFormValue(value));
		}

		return { type: "form", value: form };
	}

	const buffer = Buffer.from(await payload.arrayBuffer());
	if (buffer.length === 0) {
		return { type: "empty" };
	}

	const text = buffer.toString("utf8");

	if (isJsonContentType(contentType)) {
		try {
			return { type: "json", value: JSON.parse(text) };
		} catch {
			return {
				type: "text",
				contentType: contentType || "application/json",
				value: text,
			};
		}
	}

	if (isTextContentType(contentType)) {
		return {
			type: "text",
			contentType: contentType || "text/plain",
			value: text,
		};
	}

	return {
		type: "binary",
		contentType: contentType || "application/octet-stream",
		encoding: "base64",
		value: buffer.toString("base64"),
	};
};

const app = new Hono();
const port = Number.parseInt(process.env.PORT ?? "5678", 10);
const shouldAutoMigrate =
	(process.env.AUTO_MIGRATE_ON_START ?? "true").toLowerCase() !== "false";
let server: ReturnType<typeof serve> | undefined;

app.get("/ping", (c) => c.text("pong"));

// proxy all request to https://storeapi.kobo.com/{path}?{search}
app.all("*", async (c) => {
	const requestUrl = new URL(c.req.url);
	let pathname = requestUrl.pathname;
	if (pathname.startsWith("//")) {
		pathname = pathname.substring(1);
	}
	const path = `${pathname}${requestUrl.search}`;
	const url = `https://storeapi.kobo.com${path}`;
	const rawRequest = c.req.raw;

	console.info(`Proxying request: ${rawRequest.method} ${path}`);

	const requestBodyPromise = serializeBody(rawRequest.clone());
	const res = await fetch(url, rawRequest);
	const responseBodyPromise = serializeBody(res.clone());

	const persistRequestLog = async (): Promise<void> => {
		try {
			const [requestBody, responseBody] = await Promise.all([
				requestBodyPromise,
				responseBodyPromise,
			]);

			await db
				.insert(schema.requests)
				.values({
					method: rawRequest.method,
					path,
					requestHeaders: Object.fromEntries(rawRequest.headers.entries()),
					requestBody,
					responseStatus: res.status,
					responseHeaders: Object.fromEntries(res.headers.entries()),
					responseBody,
				})
				.execute();
		} catch (error) {
			console.error("Failed to persist proxy request log", error);
		}
	};

	await persistRequestLog();

	return res;
});

const bootstrap = async (): Promise<void> => {
	try {
		if (shouldAutoMigrate) {
			console.info("Applying database migrations...");
			await migrate(db, { migrationsFolder: "./migrations" });
			console.info("Database migrations are up to date");
		}

		server = serve(
			{
				fetch: app.fetch,
				port,
				hostname: "0.0.0.0",
			},
			() => {
				console.info(`Server is running on port ${port}`);
			},
		);
	} catch (error) {
		console.error("Failed during startup", error);
		process.exit(1);
	}
};

void bootstrap();

process.on("SIGINT", () => {
	if (!server) {
		process.exit(0);
	}

	server.close();
	process.exit(0);
});
process.on("SIGTERM", () => {
	if (!server) {
		process.exit(0);
	}

	server.close((err) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		process.exit(0);
	});
});
