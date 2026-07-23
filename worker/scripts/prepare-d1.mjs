import { readFile, writeFile } from "node:fs/promises";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const databaseName = "zxl-prd-workbench";

if (!accountId || !apiToken) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required");
}

const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
const headers = {
  Authorization: `Bearer ${apiToken}`,
  "Content-Type": "application/json",
};

const listResponse = await fetch(apiUrl, { headers });
const listPayload = await readCloudflareResponse(listResponse, "list D1 databases");
let database = listPayload.result?.find((item) => item.name === databaseName);

if (!database) {
  const createResponse = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: databaseName }),
  });
  const createPayload = await readCloudflareResponse(
    createResponse,
    "create D1 database",
  );
  database = createPayload.result;
  console.log(`Created D1 database: ${databaseName}`);
} else {
  console.log(`Using existing D1 database: ${databaseName}`);
}

const databaseId = database?.uuid || database?.id;
if (!databaseId) throw new Error("Cloudflare did not return a D1 database ID");

const baseConfig = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
const generatedConfig = `${baseConfig.trim()}

[[d1_databases]]
binding = "DB"
database_name = "${databaseName}"
database_id = "${databaseId}"
migrations_dir = "migrations"
`;

await writeFile(
  new URL("../wrangler.generated.toml", import.meta.url),
  generatedConfig,
  "utf8",
);
console.log("Generated Wrangler configuration with D1 binding");

async function readCloudflareResponse(response, operation) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const message =
      payload.errors?.map((error) => error.message).join("; ") ||
      `HTTP ${response.status}`;
    throw new Error(`Unable to ${operation}: ${message}`);
  }
  return payload;
}
