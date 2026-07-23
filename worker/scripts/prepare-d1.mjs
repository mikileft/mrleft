import { readFile, writeFile } from "node:fs/promises";

let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const databaseName = "zxl-prd-workbench";

if (!apiToken) {
  throw new Error("CLOUDFLARE_API_TOKEN is required");
}

const headers = {
  Authorization: `Bearer ${apiToken}`,
  "Content-Type": "application/json",
};

if (!accountId) {
  const accountsResponse = await fetch(
    "https://api.cloudflare.com/client/v4/accounts",
    { headers },
  );
  const accountsPayload = await readCloudflareResponse(
    accountsResponse,
    "list Cloudflare accounts",
  );
  const accounts = accountsPayload.result || [];
  if (accounts.length !== 1) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID is required when the token can access multiple accounts",
    );
  }
  accountId = accounts[0].id;
  console.log("Discovered the Cloudflare account from the scoped API token");
}

const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
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
