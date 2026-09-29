import { TEST_DATABASE_URL } from "./test-db-url";

// Values read by src/server/config/env.ts (isHttpsSite etc.).
process.env.SITE_URL = "https://usba.test";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.S3_ENDPOINT = "http://localhost:9100";
process.env.S3_BUCKET = "usba-test";
process.env.S3_ACCESS_KEY_ID = "test";
process.env.S3_SECRET_ACCESS_KEY = "test-secret";
process.env.MEDIA_BASE_URL = "https://media.test";
