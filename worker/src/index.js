import { handleTaskRequest } from "./tasks.js";
import { SKILL_CONFIG } from "./skill-config.js";

const ACTIONS = Object.fromEntries(
  SKILL_CONFIG.ai.actions.map((action) => [action.id, action.prompt]),
);
const SYSTEM_PROMPT = `你是 ZXL PRD 共创助手。你的目标是帮助用户形成可决策、可测试且证据诚实的产品需求文档。

必须遵守：
${SKILL_CONFIG.ai.systemRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      if (!cors) return json({ error: "Origin not allowed" }, 403);
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const isAssist = url.pathname === "/api/assist" && request.method === "POST";
    const isTaskRoute = url.pathname === "/api/tasks" || url.pathname.startsWith("/api/tasks/");
    if (!isAssist && !isTaskRoute) {
      return json({ error: "Not found" }, 404, cors);
    }

    if (!cors) return json({ error: "Origin not allowed" }, 403);
    if (!env.WORKBENCH_ACCESS_TOKEN) {
      return json({ error: "Workbench gateway is not configured" }, 503, cors);
    }

    const authorization = request.headers.get("Authorization") || "";
    const suppliedToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!(await tokensMatch(suppliedToken, env.WORKBENCH_ACCESS_TOKEN))) {
      return json({ error: "Invalid access token" }, 401, cors);
    }

    if (isTaskRoute) {
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > 128_000) {
        return json({ error: "Request is too large" }, 413, cors);
      }
      return handleTaskRequest(request, env, url, cors);
    }

    if (!env.AI_API_KEY || !env.AI_MODEL) {
      return json({ error: "AI gateway is not configured" }, 503, cors);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 32_000) {
      return json({ error: "Request is too large" }, 413, cors);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    if (!ACTIONS[input.action]) {
      return json({ error: "Unsupported AI action" }, 400, cors);
    }

    const context = cleanText(input.context, SKILL_CONFIG.ai.contextMaxChars);
    const targetLabel = cleanText(input.target?.label, 120) || "当前阶段";
    const targetValue = cleanText(input.target?.value, 8_000);
    if (!context) return json({ error: "PRD context is required" }, 400, cors);

    const userPrompt = `任务：${ACTIONS[input.action]}

当前处理目标：${targetLabel}

当前字段内容：
${targetValue || "（尚未填写）"}

PRD 上下文：
${context}

请只返回建议内容。`;

    try {
      const response = await fetch(
        `${(env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.AI_MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.25,
            max_tokens: 1600,
          }),
        },
      );

      if (!response.ok) {
        console.error("AI provider error", response.status, await response.text());
        return json({ error: `AI provider returned ${response.status}` }, 502, cors);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) return json({ error: "AI provider returned no content" }, 502, cors);
      return json({ content }, 200, cors);
    } catch (error) {
      console.error("AI gateway failure", error);
      return json({ error: "AI gateway request failed" }, 502, cors);
    }
  },
};

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function corsHeaders(origin, allowedOrigins = "") {
  const allowed = String(allowedOrigins)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function tokensMatch(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
  }
  return difference === 0;
}

function json(body, status = 200, cors = null) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(cors || {}),
  };
  return new Response(JSON.stringify(body), { status, headers });
}
