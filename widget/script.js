/**
 * Frontend chat widget connecting to Cloudflare Worker WebSocket endpoint.
 */

let socket;

/**
 * Sends a message to the Worker WebSocket.
 */
function sendUserMessage() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({ type: "user_message", text }));
  addMessageBubble("user", text);

  input.value = "";
}

/**
 * Adds message to UI.
 */
function addMessageBubble(sender, text) {
  const chat = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  bubble.className = sender === "user" ? "bubble user" : "bubble ai";
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

/**
 * Initializes the WebSocket connection to the Worker.
 */
function connectWS() {
  socket = new WebSocket("wss://condata-aai-chatbot.still-butterfly-bbff.workers.dev");

  socket.addEventListener("open", () => {
    addMessageBubble("system", "Connected to condata AAI Worker.");
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "assistant_delta") {
      addMessageBubble("ai", data.text);
    }
    if (data.type === "assistant_message") {
      addMessageBubble("ai", data.text);
    }
  });
}

window.addEventListener("load", connectWS);
window.sendUserMessage = sendUserMessage;
