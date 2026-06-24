import { z } from "zod";

const requestSchema = z.object({
  config: z.object({
    baseUrl: z.string().trim().url(),
    apiKey: z.string().min(1),
    model: z.string().trim().min(1),
    translationVibe: z.string().trim().max(2000).optional()
  }),
  sourceLanguage: z.string().min(2),
  targetLanguages: z.array(z.string().min(2)).min(1),
  items: z.array(
    z.object({
      key: z.string().min(1),
      text: z.string().min(1)
    })
  )
});

const translationResponseSchema = z.object({
  translations: z.record(z.string(), z.record(z.string(), z.string()))
});

function chatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return new URL(normalized);
  }
  return new URL(`${normalized}/chat/completions`);
}

function providerErrorMessage(errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === "string") return parsed.error;
    return parsed.error?.message ?? parsed.message ?? errorText;
  } catch {
    return errorText;
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { config, sourceLanguage, targetLanguages, items } = parsed.data;
  const url = chatCompletionsUrl(config.baseUrl);
  const isDeepSeek = url.hostname.endsWith("deepseek.com");
  const translationVibe = config.translationVibe?.trim();
  const requestBody: Record<string, unknown> = {
    model: config.model,
    temperature: 0.2,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are a professional product localization translator.",
          "Return only valid JSON.",
          "Preserve placeholders, ICU variables, HTML tags, and product terms.",
          "Keep translations concise and suitable for energy storage product UI.",
          "Prefer common energy-storage industry terminology and abbreviations when natural.",
          "Do not add explanations.",
          "Do not prefix translations with language codes such as [zh], [ro], [pl], or [it].",
          translationVibe ? `Project translation style: ${translationVibe}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Translate each item from sourceLanguage into every target language. Output shape: { translations: { [key]: { [languageCode]: translatedText } } }.",
          sourceLanguage,
          targetLanguages,
          items
        })
      }
    ]
  };

  if (isDeepSeek) {
    requestBody.thinking = { type: "disabled" };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach AI provider.";
    return Response.json({ error: message }, { status: 502 });
  }

  if (!response.ok) {
    return Response.json({ error: providerErrorMessage(await response.text()) }, { status: response.status });
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  try {
    const payload = JSON.parse(raw) as unknown;
    const translated = translationResponseSchema.safeParse(payload);
    if (!translated.success) {
      return Response.json({ error: "Model response did not include translations." }, { status: 502 });
    }
    return Response.json(translated.data);
  } catch {
    return Response.json({ error: "Model returned invalid JSON." }, { status: 502 });
  }
}
