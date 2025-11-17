export default {
  fetch(request, env) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    handle(server, env).catch(err => console.error(err));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
};

async function handle(ws, env) {
  // Accept browser WebSocket
  ws.accept();

  console.log("Browser WebSocket accepted.");

  // Connect to OpenAI Realtime API (NO accept()!!)
  const ai = new WebSocket(env.OPENAI_API_URL, {
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    }
  });

  ai.addEventListener("open", () => {
    console.log("Connected to OpenAI Realtime WebSocket.");

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
      const msg = JSON.parse(event.data);
      if (msg.type === "user_message") {
        ai.send(JSON.stringify({
          type: "input.text",
          text: msg.text
        }));
      }
    } catch (err) {
      console.error("Client message error:", err);
    }
  });

  // OpenAI → Browser
  ai.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "output.text.delta") {
        ws.send(msg.delta);
      }
      if (msg.type === "output.text") {
        ws.send(msg.text);
      }
    } catch (err) {
      console.error("OpenAI message error:", err);
    }
  });

  ws.addEventListener("close", () => {
    try { ai.close(); } catch (_) {}
  });

  ai.addEventListener("close", () => {
    try { ws.close(); } catch (_) {}
  });
}
