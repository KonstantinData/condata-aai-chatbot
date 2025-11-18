/**
 * condata AAI-Chatbot Cloudflare Worker
 *
 * Responsibilities:
 * - Expose a WebSocket endpoint (/ws) that bridges between the browser widget
 *   and the OpenAI Realtime API (text-based conversation).
 * - Serve static assets for the widget from env.ASSETS (public/index.html, script.js, styles.css).
 * - Provide a simple healthcheck endpoint (/health).
 * - Provide:
 *     - /voice/transcribe  → Speech-to-Text via OpenAI audio/transcriptions (Whisper)
 *     - /voice/speak       → Text-to-Speech via OpenAI audio/speech
 *
 * Notes:
 * - This Worker is designed for GDPR-friendly operation: it does not persist
 *   request/response bodies, and logs should be kept minimal in production.
 * - All OpenAI calls use env.OPENAI_API_KEY (secret in Cloudflare).
 * - For TTS/STT base URLs you can optionally configure:
 *     - OPENAI_BASE_URL              (e.g. "https://api.openai.com")
 *     - OPENAI_SPEECH_PATH           (default "/v1/audio/speech")
 *     - OPENAI_TRANSCRIPTIONS_PATH   (default "/v1/audio/transcriptions")
 */

export default {
  /**
   * Main HTTP entry point for the Worker.
   *
   * Routes:
   * - GET  /ws                → WebSocket upgrade for Realtime chat
   * - GET  /health            → Simple "ok" healthcheck
   * - POST /voice/transcribe  → STT endpoint returning text (JSON)
   * - POST /voice/speak       → TTS endpoint returning audio (mp3)
   * - Other paths             → Static assets via env.ASSETS or 404 fallback
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade") || "";

    // 1) WebSocket endpoint for chat
    if (url.pathname === "/ws" && upgradeHeader.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      handleRealtimeSession(server, env).catch((err) => {
        console.error("Realtime handler error:", err);
        try {
          server.close(1011, "Internal error");
        } catch (_) {
          // ignore
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // 2) Health check
    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 3) Speech-to-Text
    if (url.pathname === "/voice/transcribe" && request.method === "POST") {
      return handleTranscribe(request, env);
    }

    // 4) Text-to-Speech
    if (url.pathname === "/voice/speak" && request.method === "POST") {
      return handleSpeak(request, env);
    }

    // 5) Static assets (widget)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // 6) Fallback
    return new Response("Not found", { status: 404 });
  },
};

/**
 * Handle a Realtime chat session between the browser and the OpenAI Realtime API.
 *
 * Browser <-> Worker protocol:
 *   Client sends:
 *     { type: "user_message", text: string, lang?: "de" | "en" }
 *
 *   Worker sends to client:
 *     { type: "assistant_delta",   text: string }  // streaming chunks
 *     { type: "assistant_message", text: string }  // final answer
 *     { type: "error",             message: string }
 *     { type: "system",            message: string }  // only when needed
 */
async function handleRealtimeSession(clientSocket, env) {
  clientSocket.accept();
  console.log("Browser WebSocket accepted");

  if (!env.OPENAI_API_KEY) {
    safeSend(clientSocket, {
      type: "error",
      message: "Backend is not configured correctly (missing OPENAI_API_KEY).",
    });
    clientSocket.close(1011, "Missing OPENAI_API_KEY");
    return;
  }

  // Realtime WS URL is passed in via environment (wrangler.toml -> [vars].OPENAI_API_URL)
  const realtimeUrl =
    env.OPENAI_API_URL ||
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

  // OpenAI Realtime subprotocols
  const subprotocols = [
    "realtime",
    `openai-insecure-api-key.${env.OPENAI_API_KEY}`,
    "openai-beta.realtime-v1",
  ];

  let aiSocket;
  try {
    aiSocket = new WebSocket(realtimeUrl, subprotocols);
  } catch (err) {
    console.error("Failed to create outbound WebSocket:", err);
    safeSend(clientSocket, {
      type: "error",
      message: "Could not connect to the Realtime backend.",
    });
    clientSocket.close(1011, "Failed to create outbound WebSocket");
    return;
  }

  let aiOpen = false;
  const queue = [];

  aiSocket.addEventListener("open", () => {
    console.log("Connected to OpenAI Realtime");
    aiOpen = true;

    // Initial session configuration (neutral, updated per user message)
    aiSocket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions:
            "You are the condata AAI-Chatbot. Answer concisely and at an expert level. Default language can be overridden dynamically.",
        },
      }),
    );

    // Flush queued events
    for (const msg of queue) {
      aiSocket.send(msg);
    }
    queue.length = 0;
  });

  // Messages from browser → OpenAI Realtime
  clientSocket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      console.error("Invalid JSON from client:", err);
      safeSend(clientSocket, {
        type: "error",
        message: "Invalid message format from client.",
      });
      return;
    }

    if (!payload || payload.type !== "user_message" || !payload.text) {
      return;
    }

    const lang = payload.lang === "en" ? "en" : "de";

    const instructions =
      lang === "en"
        ? "You are the condata AAI-Chatbot. Answer in English. Be concise, expert-level, and transparent about limitations."
        : "You are the condata AAI-Chatbot. Answer in German. Be concise, expert-level, and transparent about limitations.";

    const events = [
      {
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions,
        },
      },
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: payload.text }],
        },
      },
      {
        type: "response.create",
        response: {
          modalities: ["text"],
        },
      },
    ];

    for (const evt of events) {
      const serialized = JSON.stringify(evt);
      if (aiOpen && aiSocket.readyState === WebSocket.OPEN) {
        aiSocket.send(serialized);
      } else {
        queue.push(serialized);
      }
    }
  });

  // Messages from OpenAI Realtime → browser
  aiSocket.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      console.error("Error parsing OpenAI message:", err);
      safeSend(clientSocket, {
        type: "error",
        message: "Could not parse response from Realtime backend.",
      });
      return;
    }

    // Explicit error events
    if (msg.type === "error" || msg.type === "response.error") {
      console.error("Realtime API error event:", msg);
      safeSend(clientSocket, {
        type: "error",
        message: msg.error?.message || "Error in Realtime backend.",
      });
      return;
    }

    // Streaming text chunks (delta events)
    const deltaText = extractDeltaText(msg);
    if (deltaText) {
      safeSend(clientSocket, { type: "assistant_delta", text: deltaText });
      return;
    }

    // Final full text (done event)
    const fullText = extractFullText(msg);
    if (fullText) {
      safeSend(clientSocket, { type: "assistant_message", text: fullText });
      return;
    }

    // Ignore internal events that are not needed by the UI
    const ignoreTypes = new Set([
      "response.output_item.added",
      "response.output_item.done",
      "response.content_part.added",
      "response.content_part.done",
      "response.output_item.created",
      "response.done",
      "rate_limits.updated",
    ]);

    if (msg.type && typeof msg.type === "string") {
      if (ignoreTypes.has(msg.type)) {
        return;
      }
      console.log("Unknown Realtime event type (ignored):", msg.type);
    }
  });

  aiSocket.addEventListener("close", (evt) => {
    console.log("OpenAI socket closed", evt.code, evt.reason);
    try {
      clientSocket.close(evt.code, evt.reason);
    } catch (_) {
      // ignore
    }
  });

  clientSocket.addEventListener("close", (evt) => {
    console.log("Browser socket closed", evt.code, evt.reason);
    try {
      aiSocket.close(evt.code, evt.reason);
    } catch (_) {
      // ignore
    }
  });

  aiSocket.addEventListener("error", (err) => {
    console.error("OpenAI WS error:", err);
    safeSend(clientSocket, {
      type: "error",
      message: "Realtime backend error.",
    });
  });
}

/**
 * Extract streaming text delta from Realtime events.
 *
 * @param {any} msg
 * @returns {string}
 */
function extractDeltaText(msg) {
  if (
    msg.type === "response.output_text.delta" &&
    typeof msg.delta === "string"
  ) {
    return msg.delta;
  }
  if (msg.type === "response.text.delta" && typeof msg.delta === "string") {
    return msg.delta;
  }
  if (msg.delta && typeof msg.delta === "string") {
    return msg.delta;
  }
  return "";
}

/**
 * Extract final text from Realtime "done" events.
 *
 * @param {any} msg
 * @returns {string}
 */
function extractFullText(msg) {
  if (msg.type === "response.output_text.done") {
    const candidates =
      msg.output_text ||
      msg.response?.output_text ||
      msg.response?.output_text_items ||
      [];
    if (Array.isArray(candidates) && candidates[0]?.content?.[0]?.text) {
      return candidates[0].content[0].text;
    }
  }

  if (msg.type === "message" && msg.role === "assistant") {
    const segments = msg.content || [];
    if (Array.isArray(segments) && segments[0]?.text) {
      return segments[0].text;
    }
  }

  if (typeof msg.text === "string") {
    return msg.text;
  }

  return "";
}

/**
 * Safely send a JSON-serializable object over a WebSocket.
 *
 * @param {WebSocket} ws
 * @param {any} obj
 */
function safeSend(ws, obj) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  } catch (_) {
    // ignore
  }
}

/**
 * Handle Text-to-Speech requests.
 *
 * Request body (JSON):
 *   {
 *     "text": "The assistant's answer.",
 *     "language": "de" | "en"
 *   }
 *
 * Response:
 *   - 200 with audio/mp3 body if successful
 *   - 4xx/5xx JSON error otherwise
 */
async function handleSpeak(request, env) {
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const text = (payload.text || "").trim();
  const language = payload.language === "en" ? "en" : "de";

  if (!text) {
    return new Response(
      JSON.stringify({ error: "Missing 'text' for speech synthesis" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const base =
    (env.OPENAI_BASE_URL &&
      env.OPENAI_BASE_URL.toString().replace(/\/+$/, "")) ||
    "https://api.openai.com";
  const speechPath = env.OPENAI_SPEECH_PATH || "/v1/audio/speech";

  // Choose a voice-capable model; adjust as needed to your account
  const model = "gpt-4o-mini";
  const voice = "alloy";

  const apiResponse = await fetch(`${base}${speechPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      format: "mp3",
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("TTS error:", apiResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: "TTS request failed" }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const audioBuffer = await apiResponse.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Handle Speech-to-Text (Transcription) requests.
 *
 * Incoming request (multipart/form-data):
 *   - field "audio": File/Blob with recorded audio (audio/webm or similar)
 *   - field "language": "de" | "en" (optional, default: "de")
 *
 * Response JSON:
 *   { "text": "<transcribed text>" }
 */
async function handleTranscribe(request, env) {
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid form-data body" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const audioFile = form.get("audio");
  const language = (form.get("language") || "de") === "en" ? "en" : "de";

  if (!audioFile || typeof audioFile === "string") {
    return new Response(
      JSON.stringify({ error: "Missing 'audio' file field" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const base =
    (env.OPENAI_BASE_URL &&
      env.OPENAI_BASE_URL.toString().replace(/\/+$/, "")) ||
    "https://api.openai.com";
  const transcribePath =
    env.OPENAI_TRANSCRIPTIONS_PATH || "/v1/audio/transcriptions";

  const openaiForm = new FormData();
  openaiForm.append("file", audioFile, "audio.webm");
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", language);

  const apiResponse = await fetch(`${base}${transcribePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: openaiForm,
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();
    console.error("STT error:", apiResponse.status, errorText);
    return new Response(
      JSON.stringify({ error: "Transcription request failed" }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const result = await apiResponse.json();
  const text = (result && result.text) || "";

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
