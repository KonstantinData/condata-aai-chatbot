/**
 * condata AAI-Chatbot Cloudflare Worker
 *
 * Responsibilities:
 * - Expose a WebSocket endpoint (/ws) that bridges between the browser widget
 *   and the OpenAI Realtime API (text-only in this version).
 * - Serve static assets for the widget from env.ASSETS (public/index.html, script.js, styles.css).
 * - Provide a simple healthcheck endpoint (/health).
 * - Provide a Text-to-Speech endpoint (/voice/speak) that turns assistant text
 *   into audio using the OpenAI audio/speech API.
 * - Provide a Speech-to-Text endpoint (/voice/transcribe) that turns recorded audio
 *   into text using the OpenAI audio/transcriptions API (Whisper).
 *
 * Notes:
 * - This Worker is designed for GDPR-friendly operation: it does not persist
 *   request/response bodies, and logs should be kept minimal in production.
 * - All OpenAI calls use env.OPENAI_API_KEY, which must be set as a secret in Cloudflare.
 */

export default {
  /**
   * Main HTTP entry point for the Worker.
   * Routes:
   * - GET  /ws                → WebSocket upgrade for the chat
   * - GET  /health            → Simple "ok" healthcheck
   * - POST /voice/transcribe  → STT endpoint returning text (JSON)
   * - POST /voice/speak       → TTS endpoint returning audio
   * - Other paths             → Static assets via env.ASSETS or 404 fallback
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgrade = request.headers.get("Upgrade") || "";

    // 1) WebSocket endpoint for the chat widget
    if (url.pathname === "/ws" && upgrade.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      handleRealtimeSession(server, env).catch((err) => {
        console.error("Realtime handler error:", err);
        try {
          server.close(1011, "Internal error");
        } catch (_) {}
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // 2) Health check (simple liveness probe)
    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 3) Speech-to-Text endpoint: audio → text
    if (url.pathname === "/voice/transcribe" && request.method === "POST") {
      return handleTranscribe(request, env);
    }

    // 4) Text-to-Speech endpoint: text → audio (mp3)
    if (url.pathname === "/voice/speak" && request.method === "POST") {
      return handleSpeak(request, env);
    }

    // 5) Static assets: serve the widget UI from the "public" directory
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // 6) Fallback if nothing matched
    return new Response("Not_found", { status: 404 });
  },
};

/**
 * Handle a Realtime chat session between the browser and the OpenAI Realtime API.
 *
 * Browser <-> Worker protocol:
 *   Client sends:
 *     { type: "user_message", text: string, lang?: "de" | "en" }
 *
 *   Worker sends:
 *     { type: "assistant_delta",   text: string }  // streaming chunks
 *     { type: "assistant_message", text: string }  // final answer
 *     { type: "error",             message: string }
 *     { type: "system",            message: string }  // only when needed
 *
 * The Worker maintains a single Realtime WebSocket (aiSocket) for each client,
 * updates the Realtime session instructions based on the user's language choice,
 * and forwards conversation events accordingly.
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

  // Use configured Realtime URL if provided, otherwise fall back to default
  const realtimeUrl =
    env.OPENAI_API_URL ||
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

  /**
   * Realtime authentication and feature negotiation via subprotocols.
   * This pattern uses an "insecure" API key in the subprotocol purely for
   * prototype/dev scenarios. For production, consider a more secure approach.
   */
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

    // Initial session configuration: text-only, neutral language.
    // Language will be refined per-user-message below.
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

    // Flush any queued events that accumulated before the Realtime socket was open
    for (const msg of queue) {
      aiSocket.send(msg);
    }
    queue.length = 0;
  });

  /**
   * Handle messages from the browser (user input).
   * This includes:
   * - Extracting text and language ("de" or "en").
   * - Updating the Realtime session instructions to match the requested language.
   * - Sending the user's text into the Realtime conversation.
   * - Triggering a new model response.
   */
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

    // Language selection: default to "de" if anything else is sent
    const lang = payload.lang === "en" ? "en" : "de";
    const instructions =
      lang === "en"
        ? "You are the condata AAI-Chatbot. Answer in English. Be concise, expert-level, and transparent about limitations."
        : "You are the condata AAI-Chatbot. Answer in German. Be concise, expert-level, and transparent about limitations.";

    const events = [
      // 1) Ensure the session uses the correct language for this turn
      {
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions,
        },
      },
      // 2) Add the user's message to the conversation
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: payload.text }],
        },
      },
      // 3) Ask the model to generate a response
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

  /**
   * Handle messages coming back from the Realtime API and forward them to the client.
   */
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

    console.log("Realtime message:", msg);

    // 1) Explicit error events from Realtime
    if (msg.type === "error" || msg.type === "response.error") {
      console.error("Realtime API error event:", msg);
      safeSend(clientSocket, {
        type: "error",
        message: msg.error?.message || "Error in Realtime backend.",
      });
      return;
    }

    // 2) Streaming text chunks (delta events)
    const deltaText = extractDeltaText(msg);
    if (deltaText) {
      safeSend(clientSocket, { type: "assistant_delta", text: deltaText });
      return;
    }

    // 3) Final response text (done event)
    const fullText = extractFullText(msg);
    if (fullText) {
      safeSend(clientSocket, { type: "assistant_message", text: fullText });
      return;
    }

    // 4) Ignore harmless internal events that are not needed by the UI
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
    } catch (_) {}
  });

  clientSocket.addEventListener("close", (evt) => {
    console.log("Browser socket closed", evt.code, evt.reason);
    try {
      aiSocket.close(evt.code, evt.reason);
    } catch (_) {}
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
 * Try to extract a streaming text delta from a Realtime event.
 * This covers typical response.output_text.delta / response.text.delta patterns.
 *
 * @param {any} msg - Parsed Realtime event message.
 * @returns {string} - Delta text, or empty string if not found.
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
 * Try to extract the final full text from a Realtime "done" event.
 *
 * @param {any} msg - Parsed Realtime event message.
 * @returns {string} - Final text, or empty string if not found.
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
 * Safely send a JSON-serializable object over a WebSocket (if open).
 *
 * @param {WebSocket} ws - Target WebSocket.
 * @param {any} obj - Object to serialize and send.
 */
function safeSend(ws, obj) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  } catch (_) {}
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

  const model = "gpt-4o-mini";
  const voice = "alloy";

  const apiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
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
      // Language hint is implicit via input and not strictly required here.
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

  const openaiForm = new FormData();
  openaiForm.append("file", audioFile, "audio.webm");
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", language);

  const apiResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: openaiForm,
    },
  );

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
