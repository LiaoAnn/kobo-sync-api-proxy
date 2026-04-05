import "dotenv/config";
import { serve } from "@hono/node-server";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db/index.js";
import app from "./server.js";

const port = Number.parseInt(process.env.PORT ?? "5678", 10);
const shouldAutoMigrate =
	(process.env.AUTO_MIGRATE_ON_START ?? "true").toLowerCase() !== "false";
let server: ReturnType<typeof serve> | undefined;

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
