import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

loadDotEnv();

const PORT = Number(process.env.AGENT_PORT || 8788);
const ALLOWED_ORIGINS = (process.env.AGENT_ALLOWED_ORIGINS || "http://127.0.0.1:8787,http://localhost:8787")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const PROVIDERS = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || "deepseek-v4-flash",
    models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
  },
  kimi: {
    id: "kimi",
    label: "Kimi / Moonshot",
    baseUrl: process.env.KIMI_BASE_URL || process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1",
    apiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY,
    defaultModel: process.env.KIMI_DEFAULT_MODEL || process.env.MOONSHOT_DEFAULT_MODEL || "kimi-k2.6",
    models: ["kimi-k2.6", "kimi-k2.7-code", "kimi-k2.7-code-highspeed", "kimi-k2.5", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
  openai: {
    id: "openai",
    label: "OpenAI Compatible",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || "gpt-4.1-mini",
    models: ["gpt-4.1-mini", "gpt-4.1"],
  },
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  setCorsHeaders(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "novel-idle-agent", port: PORT });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/providers") {
      sendJson(res, 200, {
        providers: Object.values(PROVIDERS).map(({ id, label, baseUrl, apiKey, defaultModel, models }) => ({
          id,
          label,
          baseUrl,
          configured: Boolean(apiKey),
          defaultModel,
          models,
        })),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(req);
      const result = await runChat(body);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Agent server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Novel Idle agent server listening on http://127.0.0.1:${PORT}`);
});

async function runChat(body) {
  const provider = providerFor(body.provider);
  if (!provider.apiKey) {
    throw httpError(400, `${provider.label} is not configured. Set ${envKeyForProvider(provider.id)} in .env or your shell.`);
  }

  const model = cleanString(body.model) || provider.defaultModel;
  const system = cleanString(body.system) || "You are a careful local writing assistant. Answer in Chinese unless the user asks otherwise.";
  const prompt = cleanString(body.prompt);
  const contextPack = cleanString(body.contextPack);
  if (!prompt && !contextPack) throw httpError(400, "prompt or contextPack is required.");

  const started = Date.now();
  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.3,
      max_tokens: Number.isFinite(Number(body.maxTokens)) ? Number(body.maxTokens) : 4096,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: contextPack ? `${prompt}\n\n---\n\n${contextPack}` : prompt,
        },
      ],
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || json?.message || `Provider returned HTTP ${response.status}`;
    throw httpError(response.status, message);
  }

  return {
    provider: provider.id,
    model,
    content: json?.choices?.[0]?.message?.content || "",
    usage: json?.usage || null,
    durationMs: Date.now() - started,
  };
}

function providerFor(id) {
  const provider = PROVIDERS[cleanString(id) || "deepseek"];
  if (!provider) throw httpError(400, `Unknown provider: ${id}`);
  return provider;
}

function envKeyForProvider(id) {
  if (id === "kimi") return "KIMI_API_KEY or MOONSHOT_API_KEY";
  return `${id.toUpperCase()}_API_KEY`;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(httpError(413, "Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(httpError(400, "Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function loadDotEnv() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
