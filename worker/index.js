/**
 * Cloudflare Worker that proxies a browser WebSocket to the OpenAI Realtime API.
 * Implements correct inbound (WebSocketPair) and outbound (WebSocket.connect) sockets.
 */

export default {
  /**
   * Handles incoming HTTP requests. If the request is a WebSocket upgrade,
   * creates a WebSocketPair and hands one side to the `handle()` function.
   */
  async fetch(request, env) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    handle(server, env).catch(err => console.error("Handler error:", err));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
};

/**
 * Main handler managing the proxy between browser WebSocket and OpenAI Realtime WebSocket.
 */
async function handle(ws, env) {
  ws.accept();
  console.log("Browser WebSocket accepted.");

  // Outbound socket to OpenAI Realtime API — MUST use WebSocket.connect()
  const ai = WebSocket.connect(env.OPENAI_API_URL, {
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`
    }
  });

  console.log("Connecting to OpenAI Realtime…");

  ai.addEventListener("open", () => {
    console.log("Connected to OpenAI.");
    ai.send(JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["text"],
        instructions: "You are the condata AAI assistant."
      }
    }));
  });

  // Browser → OpenAI
  ws.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "user_message") {
        ai.send(JSON.stringify({
          type: "input.text",
          text: payload.text
        }));
      }
    } catch (err) {
      console.error("Browser message error:", err);
    }
  });

  // OpenAI → Browser
  ai.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "output.text.delta") {
        ws.send(JSON.stringify({ type: "assistant_delta", text: msg.delta }));
      }
      if (msg.type === "output.text") {
        ws.send(JSON.stringify({ type: "assistant_message", text: msg.text }));
      }
    } catch (err) {
      console.error("OpenAI message error:", err);
    }
  });

  // Handle closes
  ai.addEventListener("close", () => ws.close());
  ws.addEventListener("close", () => ai.close());
}
