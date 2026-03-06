import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { z } from "zod";

const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.1-flash-lite-preview";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 15_000;

const incomingSubscriptionSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  amount: z.coerce.number().finite(),
  currency: z.string().min(1),
  billingCycle: z.string().min(1),
  nextBillingDate: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  status: z.enum(["active", "paused", "expired"]).optional(),
});

const aiCoachRequestSchema = z.object({
  subscriptions: z.array(incomingSubscriptionSchema).default([]),
});

const normalizedInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  reason: z.string().min(1),
  savings: z.coerce.number().finite().nonnegative(),
  confidence: z.enum(["Высокая", "Средняя"]),
  impact: z.enum(["low", "medium", "high", "risk"]),
});

function getHttpRefererHeader(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) {
    return "http://localhost";
  }

  if (/^https?:\/\//i.test(domain)) {
    return domain;
  }

  return `https://${domain}`;
}

function extractContentText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function tryParseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeInsights(rawInsights: unknown): Array<z.infer<typeof normalizedInsightSchema>> {
  if (!Array.isArray(rawInsights)) return [];

  const normalized = rawInsights
    .slice(0, 5)
    .map((raw, index) => {
      const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const normalizedCandidate = {
        id:
          typeof candidate.id === "string" && candidate.id.trim().length > 0
            ? candidate.id.trim()
            : `insight-${index + 1}`,
        title: typeof candidate.title === "string" ? candidate.title.trim() : "",
        reason: typeof candidate.reason === "string" ? candidate.reason.trim() : "",
        savings: typeof candidate.savings === "number" ? candidate.savings : Number(candidate.savings ?? 0),
        confidence: candidate.confidence === "Высокая" ? "Высокая" : "Средняя",
        impact:
          candidate.impact === "low" ||
          candidate.impact === "medium" ||
          candidate.impact === "high" ||
          candidate.impact === "risk"
            ? candidate.impact
            : "medium",
      };

      const result = normalizedInsightSchema.safeParse(normalizedCandidate);
      return result.success ? result.data : null;
    })
    .filter((item): item is z.infer<typeof normalizedInsightSchema> => Boolean(item));

  return normalized.slice(0, 5);
}

function buildPrompt(subscriptions: z.infer<typeof incomingSubscriptionSchema>[]): string {
  const compactSubscriptions = subscriptions.map((subscription) => ({
    name: subscription.name,
    amount: subscription.amount,
    currency: subscription.currency,
    billingCycle: subscription.billingCycle,
    category: subscription.category,
    nextBillingDate: subscription.nextBillingDate,
  }));

  return [
    "Сформируй до 5 коротких финансовых инсайтов по подпискам.",
    "Верни ТОЛЬКО JSON-объект без markdown с форматом:",
    '{"summary":"...","insights":[{"id":"...","title":"...","reason":"...","savings":123,"confidence":"Высокая|Средняя","impact":"low|medium|high|risk"}]}',
    "Требования:",
    "- insights максимум 5 элементов;",
    "- confidence только Высокая или Средняя;",
    "- impact только low|medium|high|risk;",
    "- savings это положительное число месячной экономии.",
    "Данные подписок:",
    JSON.stringify(compactSubscriptions),
  ].join("\n");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.post("/api/ai-coach/insights", async (req, res) => {
    const parsedBody = aiCoachRequestSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const activeSubscriptions = parsedBody.data.subscriptions.filter(
      (subscription) => !subscription.status || subscription.status === "active",
    );

    const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    const generatedAt = new Date().toISOString();

    if (activeSubscriptions.length < 3) {
      return res.json({
        insights: [],
        summary: "",
        model,
        generatedAt,
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("AI Coach OpenRouter error", {
        code: "missing_api_key",
        message: "OPENROUTER_API_KEY is not set",
      });
      return res.status(500).json({ message: "AI Coach is not configured" });
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": getHttpRefererHeader(),
          "X-Title": "SubTrack AI Coach",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Ты финансовый ассистент. Отвечай строго валидным JSON-объектом без пояснений.",
            },
            {
              role: "user",
              content: buildPrompt(activeSubscriptions),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = (await response.text()) || "OpenRouter request failed";
        const latencyMs = Date.now() - startedAt;
        console.error("AI Coach OpenRouter error", {
          code: `http_${response.status}`,
          message: errorText,
          model,
          latencyMs,
        });
        return res.status(502).json({ message: "Failed to generate AI insights" });
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const content = extractContentText(payload.choices?.[0]?.message?.content);
      const parsed = tryParseJsonFromText(content) as
        | { summary?: unknown; insights?: unknown }
        | null;

      const insights = normalizeInsights(parsed?.insights);
      const summary = typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
      const latencyMs = Date.now() - startedAt;

      console.log("AI Coach OpenRouter success", {
        model,
        latencyMs,
        tokens: {
          prompt: payload.usage?.prompt_tokens ?? null,
          completion: payload.usage?.completion_tokens ?? null,
          total: payload.usage?.total_tokens ?? null,
        },
      });

      return res.json({
        insights,
        summary,
        model,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"));

      console.error("AI Coach OpenRouter error", {
        code: isAbortError ? "timeout" : "request_failed",
        message: error instanceof Error ? error.message : "Unknown error",
        model,
        latencyMs,
      });

      return res.status(502).json({
        message: isAbortError ? "AI request timed out" : "Failed to generate AI insights",
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
