import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const sourceDatabaseUrl = process.env.DATABASE_URL;

if (!sourceDatabaseUrl) {
  throw new Error("DATABASE_URL is required for model integration tests");
}

const testDatabaseUrl = new URL(sourceDatabaseUrl);
const host = testDatabaseUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();

if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new Error(
    "Model integration tests require a local PostgreSQL DATABASE_URL",
  );
}

testDatabaseUrl.pathname = "/bits_portal_test";

export const testDatabaseConnectionString = testDatabaseUrl.toString();
export const testPool = new Pool({
  connectionString: testDatabaseConnectionString,
});

export const verifyTestDatabase = async () => {
  const result = await testPool.query("SELECT current_database() AS database");

  if (result.rows[0].database !== "bits_portal_test") {
    throw new Error("Refusing to run integration tests outside bits_portal_test");
  }
};
