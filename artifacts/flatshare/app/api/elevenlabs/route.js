const ELEVENLABS_ENDPOINT =
  "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM";
const MAX_TEXT_LENGTH = 5_000;

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

  const { text } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return jsonError("There is no translation to read aloud.", 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(
      `Text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.`,
      413,
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return jsonError("ELEVENLABS_API_KEY is not configured on the server.", 503);
  }

  try {
    const upstream = await fetch(ELEVENLABS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!upstream.ok) {
      const message =
        upstream.status === 401 || upstream.status === 403
          ? "ElevenLabs rejected the API key. Check ELEVENLABS_API_KEY and try again."
          : upstream.status === 429
            ? "ElevenLabs is rate-limiting requests. Please wait and try again."
            : `ElevenLabs could not generate audio (HTTP ${upstream.status}). Please try again.`;
      return jsonError(message, 502);
    }

    const audio = await upstream.arrayBuffer();
    if (audio.byteLength === 0) {
      return jsonError("ElevenLabs returned an empty audio file.", 502);
    }

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return jsonError("Audio generation timed out. Please try again.", 504);
    }

    return jsonError(
      "Unable to reach ElevenLabs right now. Please try again.",
      502,
    );
  }
}
