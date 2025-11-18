/**
 * condata AAI-Chatbot Cloudflare Worker
 *
 * - /ws      : WebSocket endpoint for the chatbot UI (browser <-> OpenAI Realtime)
 * - /health  : Simple healthcheck
 * - Static   : All other paths served from env.ASSETS (public/index.html, script.js, styles.css)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upgrade = request.headers.get("Upgrade") || "";

    // 1) WebSocket endpoint for the chat
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

    // 2) Health check
    if (url.pathname === "/health") {
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 3) Static assets (UI)
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    // 4) Fallback
    return new Response("Not_found", { status: 404 });
  },
};

/**
 * Realtime session: browser WebSocket <-> OpenAI Realtime API
 *
 * Browser <-> Worker protocol:
 *   Client sends:   { type: "user_message", text: string }
 *   Worker sends:   { type: "assistant_delta",   text: string }  (Streaming)
 *                   { type: "assistant_message", text: string }  (final)
 *                   { type: "error",            message: string }
 */
async function handleRealtimeSession(clientSocket, env) {
  clientSocket.accept();
  console.log("Browser WebSocket accepted");

  if (!env.OPENAI_API_KEY) {
    safeSend(clientSocket, {
      type: "error",
      message: "Backend nicht korrekt konfiguriert (OPENAI_API_KEY fehlt).",
    });
    clientSocket.close(1011, "Missing OPENAI_API_KEY");
    return;
  }

  const realtimeUrl =
    env.OPENAI_API_URL ||
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

  // Auth + Beta-Flag über Subprotokolle
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
      message: "Realtime-Verbindung zum Modell konnte nicht erstellt werden.",
    });
    clientSocket.close(1011, "Failed to create outbound WebSocket");
    return;
  }

  let aiOpen = false;
  const queue = [];

  aiSocket.addEventListener("open", () => {
    console.log("Connected to OpenAI Realtime");
    aiOpen = true;

    // Session konfigurieren (Text-only, DE, condata-Kontext)
    aiSocket.send(
      JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions:
            "You are the condata AAI-Chatbot. Answer in German by default. Be concise, expert-level, and transparent about limitations.",
        },
      }),
    );

    // gepufferte Nachrichten nachschieben
    for (const msg of queue) {
      aiSocket.send(msg);
    }
    queue.length = 0;
  });

  // Browser -> OpenAI
  clientSocket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      console.error("Invalid JSON from client:", err);
      safeSend(clientSocket, {
        type: "error",
        message: "Ungültige Nachricht vom Client.",
      });
      return;
    }

    if (!payload || payload.type !== "user_message" || !payload.text) {
      return;
    }

    const events = [
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

  // OpenAI -> Browser
  aiSocket.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      console.error("Error parsing OpenAI message:", err);
      safeSend(clientSocket, {
        type: "error",
        message: "Antwort des KI-Backends konnte nicht gelesen werden.",
      });
      return;
    }

    console.log("Realtime message:", msg);

    // 1) Fehler-Events direkt zum Client
    if (msg.type === "error" || msg.type === "response.error") {
      console.error("Realtime API error event:", msg);
      safeSend(clientSocket, {
        type: "error",
        message: msg.error?.message || "Fehler im Realtime-Backend.",
      });
      return;
    }

    // 2) Token-Streaming → assistant_delta
    const deltaText = extractDeltaText(msg);
    if (deltaText) {
      safeSend(clientSocket, { type: "assistant_delta", text: deltaText });
      return;
    }

    // 3) Vollständige Antwort → assistant_message
    const fullText = extractFullText(msg);
    if (fullText) {
      safeSend(clientSocket, { type: "assistant_message", text: fullText });
      return;
    }

    // 4) Harmlosen internen Event-Typ ignorieren
    const ignoreTypes = new Set([
      "response.output_item.added",
      "response.output_item.done",
      "response.content_part.added",
      "response.content_part.done",
      "response.done",
      "response.output_item.created",
      "rate_limits.updated",
    ]);

    if (msg.type && typeof msg.type === "string") {
      if (ignoreTypes.has(msg.type)) {
        return;
      }
      console.log("Unbekanntes Realtime-Event (ignoriert):", msg.type);
    }
  });

  // Schließen / Fehler
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
      message: "Realtime-Backend-Fehler.",
    });
  });
}

/**
 * Text-Delta aus einem Realtime-Event extrahieren.
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
 * Vollständigen Text aus einem "fertigen" Realtime-Event extrahieren.
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
 * Sicheres Senden zum Client-WebSocket.
 */
function safeSend(ws, obj) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  } catch (_) {}
}
