/**
 * condata AAI-Chatbot frontend widget
 * - Floating, collapsible UI
 * - WebSocket zu /ws auf dem gleichen Host
 */

let socket = null;
let isOpen = false;
let lastAssistantBubble = null;

function buildWebSocketUrl() {
  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${loc.host}/ws`;
}

function ensureSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  const url = buildWebSocketUrl();
  socket = new WebSocket(url);

  // keine Systemmeldung beim Verbindungsaufbau
  socket.addEventListener("open", () => {});

  socket.addEventListener("message", (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      console.error("Invalid JSON from backend:", err);
      return;
    }

    if (data.type === "assistant_delta") {
      appendAssistantDelta(data.text || "");
    } else if (data.type === "assistant_message") {
      appendAssistantFinal(data.text || "");
    } else if (data.type === "error") {
      addSystemMessage(
        data.message || "Fehler im KI-Backend. Bitte später erneut versuchen.",
      );
    } else if (data.type === "system") {
      addSystemMessage(data.message || "");
    }
  });

  socket.addEventListener("close", () => {
    addSystemMessage("Verbindung geschlossen.");
  });

  socket.addEventListener("error", () => {
    addSystemMessage("Verbindungsfehler zum Backend.");
  });
}

/* UI helpers */

function getMessagesContainer() {
  return document.getElementById("condata-chat-messages");
}

function addMessageBubble(role, text) {
  const container = getMessagesContainer();
  const bubble = document.createElement("div");
  bubble.className = `condata-msg ${role}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  if (role === "ai") lastAssistantBubble = bubble;
  return bubble;
}

function addSystemMessage(text) {
  return addMessageBubble("system", text);
}

/**
 * Streaming: baut die aktuelle AI-Bubble schrittweise auf.
 */
function appendAssistantDelta(delta) {
  if (!delta) return;
  if (!lastAssistantBubble) {
    lastAssistantBubble = addMessageBubble("ai", delta);
  } else {
    lastAssistantBubble.textContent += delta;
  }
}

/**
 * Finale Antwort: setzt den endgültigen Text in die bestehende Bubble.
 */
function appendAssistantFinal(fullText) {
  if (!fullText) return;

  if (lastAssistantBubble) {
    // bestehenden Inhalt durch den finalen Text ersetzen
    lastAssistantBubble.textContent = fullText;
  } else {
    // falls aus irgendeinem Grund keine Delta-Bubble existiert
    lastAssistantBubble = addMessageBubble("ai", fullText);
  }
}

/* Input + send */

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function sendCurrentMessage() {
  const input = document.getElementById("condata-chat-input");
  const text = (input.value || "").trim();
  if (!text) return;

  // Nicht senden, solange der Socket nicht offen ist
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage("Verbindung wird aufgebaut. Bitte Nachricht erneut senden.");
    ensureSocket();
    return;
  }

  // Neue User-Nachricht → alten AI-Stream abschließen
  lastAssistantBubble = null;

  addMessageBubble("user", text);
  input.value = "";
  autoResizeTextarea(input);

  try {
    socket.send(JSON.stringify({ type: "user_message", text }));
  } catch (err) {
    console.error("Failed to send user_message:", err);
    addSystemMessage("Nachricht konnte nicht gesendet werden.");
  }
}

/* Widget open/close */

function openWidget() {
  const root = document.getElementById("condata-chat-root");
  if (!root) return;
  if (!isOpen) {
    isOpen = true;
    root.classList.add("is-open");
    ensureSocket();
  }
}

function closeWidget() {
  const root = document.getElementById("condata-chat-root");
  if (!root) return;
  isOpen = false;
  root.classList.remove("is-open");
}

/* Init */

function initCondataChat() {
  const launcher = document.getElementById("condata-chat-launcher");
  const closeBtn = document.getElementById("condata-chat-close");
  const sendBtn = document.getElementById("condata-chat-send");
  const input = document.getElementById("condata-chat-input");

  if (launcher) launcher.addEventListener("click", openWidget);
  if (closeBtn) closeBtn.addEventListener("click", closeWidget);

  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendCurrentMessage();
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendCurrentMessage();
      }
    });
    input.addEventListener("input", () => autoResizeTextarea(input));
  }

  addSystemMessage(
    "Willkommen beim condata AAI-Chatbot. Stellen Sie Ihre Fragen zu Datenstrategie, KI & Analytics.",
  );
}

window.addEventListener("DOMContentLoaded", initCondataChat);
