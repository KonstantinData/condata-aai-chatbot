/**
 * ================================================================
 * Description:
 * UI logic for the condata AAI chatbot.
 * - Opens/closes widget
 * - Manages WebSocket connection
 * - Sends/receives chat messages
 * ================================================================
 */

let socketReady = false;

// --- UI Logic ----------------------------------------------------

const launcher = document.getElementById("chatbot-launcher");
const chatPanel = document.getElementById("chat-panel");
const closeBtn = document.getElementById("close-chat");

launcher.addEventListener("click", () => {
    chatPanel.classList.remove("hidden");
});

closeBtn.addEventListener("click", () => {
    chatPanel.classList.add("hidden");
});

// --- WebSocket Connection ----------------------------------------

const socket = new WebSocket("wss://condata-aai-chatbot.still-butterfly-bbff.workers.dev");
socket.addEventListener("open", () => {
    socketReady = true;
    appendAssistantMessage("Connected to condata AAI Worker.");
});

socket.addEventListener("message", (event) => {
    appendAssistantMessage(event.data);
});

// --- Sending Messages --------------------------------------------

const input = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

sendBtn.addEventListener("click", () => {
    sendUserMessage();
});

input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") sendUserMessage();
});

function sendUserMessage() {
    const text = input.value.trim();
    if (!text) return;

    // prevent sending before socket is ready
    if (!socketReady || socket.readyState !== WebSocket.OPEN) {
        appendAssistantMessage("Connection is not ready yet. Please wait a moment.");
        return;
    }

    appendUserMessage(text);
    socket.send(JSON.stringify({ type: "user_message", text }));
    input.value = "";
}

// --- Rendering ----------------------------------------------------

const messages = document.getElementById("chat-messages");

function appendUserMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message", "user");
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function appendAssistantMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message", "assistant");
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}
