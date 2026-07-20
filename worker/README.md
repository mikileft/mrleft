# ZXL PRD AI gateway

This Cloudflare Worker keeps the model API key out of the public GitHub Pages
application. It accepts requests only from configured origins and requires a
separate workbench access token.

## Prerequisites

- A Cloudflare account
- An API key for an OpenAI-compatible model provider
- Node.js with `npx`

## Configure

Review `wrangler.toml` and set:

- `AI_BASE_URL`: provider base URL ending before `/chat/completions`
- `AI_MODEL`: provider model identifier
- `ALLOWED_ORIGINS`: comma-separated exact origins allowed to call the Worker

Do not put either secret in `wrangler.toml`. Store them with Wrangler:

```bash
cd worker
npx wrangler@latest login
npx wrangler@latest secret put AI_API_KEY
npx wrangler@latest secret put WORKBENCH_ACCESS_TOKEN
```

Use a long, random value for `WORKBENCH_ACCESS_TOKEN`. This is the value entered
in the workbench's **配置 AI** dialog; the model provider key never enters the
browser.

## Deploy

### GitHub Actions

The repository workflow `.github/workflows/deploy-ai-worker.yml` deploys the
Worker whenever `worker/` changes. Configure these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `AI_API_KEY`
- `WORKBENCH_ACCESS_TOKEN`

The last two values are uploaded to Cloudflare as encrypted Worker secrets and
are not written to `wrangler.toml`.

### Local deployment

```bash
npx wrangler@latest deploy
```

Wrangler prints a URL similar to:

```text
https://zxl-prd-ai-mikileft.<account-subdomain>.workers.dev
```

Enter the full endpoint in the workbench:

```text
https://zxl-prd-ai-mikileft.<account-subdomain>.workers.dev/api/assist
```

## Provider examples

OpenAI:

```toml
AI_BASE_URL = "https://api.openai.com/v1"
AI_MODEL = "gpt-4.1-mini"
```

For another provider, use its OpenAI-compatible base URL and model name. Native
Anthropic or Gemini APIs require an adapter and are not accepted directly by
this Worker.

## Security notes

- Treat the workbench token as a password and rotate it if exposed.
- Restrict `ALLOWED_ORIGINS` to exact production and development origins.
- Review provider retention settings before sending confidential PRD content.
- Add Cloudflare rate limiting before sharing the endpoint with many users.
- The Worker logs provider status codes, not PRD request content.
