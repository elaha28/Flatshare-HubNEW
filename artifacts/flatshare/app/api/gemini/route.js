const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
const MAX_TEXT_LENGTH = 20_000;
const SUPPORTED_LANGUAGES = new Set([
  "Spanish",
  "Mandarin",
  "French",
  "Arabic",
]);

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const { documentText, targetLanguage } = body ?? {};

  if (typeof documentText !== "string" || !documentText.trim()) {
    return jsonError("Add document text before analyzing it.", 400);
  }

  if (documentText.length > MAX_TEXT_LENGTH) {
    return jsonError(
      `Document text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.`,
      413,
    );
  }

  if (typeof targetLanguage !== "string" || !SUPPORTED_LANGUAGES.has(targetLanguage)) {
    return jsonError("Choose a supported translation language.", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return jsonError("GEMINI_API_KEY is not configured on the server.", 503);
  }

  const prompt = `You are a helpful assistant for university students. Read the following document. 1. Provide a plain English summary of the key points. 2. Translate that summary into ${targetLanguage}. Format your response as a valid JSON object with exactly two keys: 'summary' and 'translation'. Do not wrap it in markdown blockquotes.\n\n${documentText.trim()}`;

  try {
    const upstream = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );

    if (!upstream.ok) {
      const messageByStatus = {
        401: "Gemini rejected the API key. Check that it is valid and has Gemini API access.",
        403: "Gemini denied this request. Check the API key permissions and project access.",
        404: "The Gemini model endpoint was not found. Check the configured model name.",
        429: "The Gemini API quota or rate limit was reached. Please try again later.",
      };
      return jsonError(
        messageByStatus[upstream.status] ??
          `Gemini could not analyze this document (HTTP ${upstream.status}). Please try again.`,
        502,
      );
    }

    const result = await upstream.json();
    const modelText = result?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!modelText) {
      return jsonError("Gemini returned an empty response. Please try again.", 502);
    }

    const jsonText = modelText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    const parsed = JSON.parse(
      firstBrace >= 0 && lastBrace > firstBrace
        ? jsonText.slice(firstBrace, lastBrace + 1)
        : jsonText,
    );

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.translation !== "string" ||
      !parsed.summary.trim() ||
      !parsed.translation.trim()
    ) {
      return jsonError(
        "Gemini returned an incomplete result. Please try the document again.",
        502,
      );
    }

    return Response.json({
      summary: parsed.summary.trim(),
      translation: parsed.translation.trim(),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return jsonError("Document analysis timed out. Please try again.", 504);
    }

    if (error instanceof SyntaxError) {
      return jsonError(
        "Gemini returned a response that could not be read. Please try again.",
        502,
      );
    }

    return jsonError("Unable to reach Gemini right now. Please try again.", 502);
  }
}
