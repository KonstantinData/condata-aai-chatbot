/**
 * condata AAI-Chatbot frontend widget
 *
 * - Floating, collapsible UI
 * - WebSocket to /ws on the same host
 * - Language toggle DE/EN (UI texts + backend language)
 * - Text chat with streaming responses
 * - Text-to-Speech for assistant answers (/voice/speak)
 * - Speech input via microphone + transcription (/voice/transcribe)
 * - Auto-stop of recording after ~1.5s silence (voice → send)
 */

let socket = null;
let isOpen = false;
let lastAssistantBubble = null;
let currentLang = "de";

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Voice playback toggle (TTS)
let voiceEnabled = true;

// For silence detection
let audioContext = null;
let analyser = null;
let silenceMonitorId = null;
let lastVoiceActivity = 0;

/**
 * Simple i18n table for static UI texts.
 */
const I18N = {
  de: {
    subtitle: "KI-Assistent für Ihre Fragen zu Daten & KI.",
    disclaimer:
      "Sie interagieren mit einem KI-System (condata AAI-Chatbot). Antworten können Fehler enthalten und ersetzen keine individuelle Beratung.",
    welcome:
      "Stellen Sie Ihre Fragen zu KI-Beratung, Datenstrategie & Prozessautomatisierungen. Sie können jederzeit zwischen Deutsch (DE) und Englisch (EN) wechseln.",
    inputPlaceholder: "Ihre Frage an den Chatbot...",
    launcherLabel: "AI-Chat",
    recordingHint:
      "Spracheingabe läuft … nach einer kurzen Pause wird automatisch gesendet.",
    reconnectHint:
      "Verbindung wird aufgebaut. Bitte Nachricht oder Aufnahme erneut senden.",
  },
  en: {
    subtitle: "AI assistant for your questions on data & AI.",
    disclaimer:
      "You are interacting with an AI system (condata AAI-Chatbot). Responses may contain errors and do not replace individual advice.",
    welcome:
      "Ask your questions about AI consulting, data strategy & process automation. You can switch between German (DE) and English (EN) at any time.",
    inputPlaceholder: "Your question to the chatbot...",
    launcherLabel: "AI Chat",
    recordingHint:
      "Voice input is active… after a short pause your request will be sent automatically.",
    reconnectHint:
      "Connecting… Please send your message or recording again.",
  },
};

function t(key) {
  const set = I18N[currentLang] || I18N.de;
  return set[key] || "";
}

/**
 * Apply current language texts to the UI.
 */
function applyLanguageTexts() {
  const subtitleEl = document.querySelector(".condata-chat-subtitle");
  if (subtitleEl) subtitleEl.textContent = t("subtitle");

  const disclaimerEl = document.querySelector(".condata-chat-disclaimer");
  if (disclaimerEl) disclaimerEl.textContent = t("disclaimer");

  const input = document.getElementById("condata-chat-input");
  if (input) input.placeholder = t("inputPlaceholder");

  const launcherLabel = document.querySelector(".condata-chat-launcher-label");
  if (launcherLabel) launcherLabel.textContent = t("launcherLabel");
}

/**
 * Build WebSocket URL to the Worker /ws endpoint (same origin).
 */
function buildWebSocketUrl() {
  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${loc.host}/ws`;
}

/**
 * Ensure that a WebSocket connection to the backend exists.
 */
function ensureSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  const url = buildWebSocketUrl();
  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    // connection established
  });

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
  if (!container) return document.createElement("div");

  const bubble = document.createElement("div");
  bubble.className = `condata-msg ${role}`;
  bubble.textContent = text;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;

  if (role === "ai") {
    lastAssistantBubble = bubble;
  }

  return bubble;
}

function addSystemMessage(text) {
  return addMessageBubble("system", text);
}

/**
 * Handle streaming assistant text (partial chunks).
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
 * Handle final assistant answer text and trigger TTS (if enabled).
 */
function appendAssistantFinal(fullText) {
  if (!fullText) return;

  if (lastAssistantBubble) {
    lastAssistantBubble.textContent = fullText;
  } else {
    lastAssistantBubble = addMessageBubble("ai", fullText);
  }

  // Nur Voice, wenn Voice aktiviert ist
  if (voiceEnabled) {
    speakAssistantText(fullText);
  }
}

/* Input + sending */

function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function sendCurrentMessage() {
  const input = document.getElementById("condata-chat-input");
  if (!input) return;

  const text = (input.value || "").trim();
  if (!text) return;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addSystemMessage(t("reconnectHint"));
    ensureSocket();
    return;
  }

  lastAssistantBubble = null;

  addMessageBubble("user", text);
  input.value = "";
  autoResizeTextarea(input);

  try {
    socket.send(
      JSON.stringify({ type: "user_message", text, lang: currentLang }),
    );
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

/**
 * Language toggle DE/EN in header.
 */
function initLanguageToggle() {
  const header = document.querySelector(".condata-chat-header");
  if (!header) return;

  const toggle = document.createElement("div");
  toggle.className = "condata-lang-toggle";
  toggle.innerHTML = `
    <button type="button" data-lang="de" class="active">DE</button>
    <button type="button" data-lang="en">EN</button>
  `;

  const closeButton = document.getElementById("condata-chat-close");
  if (closeButton && closeButton.parentElement === header) {
    header.insertBefore(toggle, closeButton);
  } else {
    header.appendChild(toggle);
  }

  toggle.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-lang]");
    if (!btn) return;

    const lang = btn.getAttribute("data-lang") || "de";
    currentLang = lang === "en" ? "en" : "de";

    toggle.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });

    applyLanguageTexts();
  });
}

/**
 * Voice playback toggle (TTS) in header.
 * Voice ist standardmäßig aktiv (voiceEnabled = true).
 */
function initVoiceToggle() {
  const header = document.querySelector(".condata-chat-header");
  if (!header) return;

  const voiceToggle = document.createElement("button");
  voiceToggle.type = "button";
  voiceToggle.id = "condata-voice-toggle";
  voiceToggle.className = "condata-voice-toggle active";
  voiceToggle.setAttribute("aria-pressed", "true");
  voiceToggle.title =
    currentLang === "en"
      ? "Toggle voice playback"
      : "Sprachausgabe ein/aus";
  voiceToggle.innerHTML = "🔊";

  const closeButton = document.getElementById("condata-chat-close");
  if (closeButton && closeButton.parentElement === header) {
    header.insertBefore(voiceToggle, closeButton);
  } else {
    header.appendChild(voiceToggle);
  }

  voiceToggle.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    voiceToggle.classList.toggle("active", voiceEnabled);
    voiceToggle.setAttribute("aria-pressed", voiceEnabled ? "true" : "false");
  });
}

/**
 * Insert microphone button into the input bar.
 * Uses .condata-chat-input-bar (your CSS/HTML class).
 */
function initMicButton() {
  let wrapper =
    document.querySelector(".condata-chat-input-bar") ||
    document.querySelector(".condata-chat-input-wrapper");

  const sendBtn = document.getElementById("condata-chat-send");
  if (!wrapper || !sendBtn) return;

  const micBtn = document.createElement("button");
  micBtn.type = "button";
  micBtn.id = "condata-chat-mic";
  micBtn.className = "condata-chat-mic";
  micBtn.setAttribute("aria-label", "Sprachaufnahme starten/stoppen");
  micBtn.innerHTML = "🎤";

  // Insert mic button directly before the send button
  wrapper.insertBefore(micBtn, sendBtn);

  micBtn.addEventListener("click", toggleRecording);
}

/**
 * Update mic button UI state.
 */
function updateMicUi(recording) {
  const micBtn = document.getElementById("condata-chat-mic");
  if (!micBtn) return;
  isRecording = recording;
  micBtn.classList.toggle("recording", recording);
}

/**
 * Start silence monitor using Web Audio API.
 * Wenn länger als ~1.5s keine Stimme, Aufnahme stoppen.
 */
function startSilenceMonitor() {
  if (!analyser) return;
  const dataArray = new Uint8Array(analyser.fftSize);
  lastVoiceActivity = performance.now();

  function check() {
    if (!isRecording || !analyser) return;

    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] - 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const threshold = 10; // kleine Schwelle gegen Rauschen

    const now = performance.now();
    if (rms > threshold) {
      // Stimme erkannt
      lastVoiceActivity = now;
    } else if (now - lastVoiceActivity > 1500) {
      // länger als 1.5s "still" -> Aufnahme beenden
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      return; // Monitor wird im stop-Handler aufgeräumt
    }

    silenceMonitorId = requestAnimationFrame(check);
  }

  silenceMonitorId = requestAnimationFrame(check);
}

/**
 * Start/stop recording with mic button.
 * - Start: beginnt Aufnahme + Silence-Monitor
 * - Auto-Stop: nach 1.5s Ruhe → mediaRecorder.stop()
 */
async function toggleRecording() {
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    // Web Audio für Silence-Detection
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) {
        audioChunks.push(e.data);
      }
    });

    mediaRecorder.addEventListener("stop", () => {
      // Streams und AudioContext aufräumen
      stream.getTracks().forEach((t) => t.stop());

      if (silenceMonitorId !== null) {
        cancelAnimationFrame(silenceMonitorId);
        silenceMonitorId = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      analyser = null;

      updateMicUi(false);

      if (audioChunks.length === 0) return;
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      sendAudioForTranscription(blob);
    });

    mediaRecorder.start();
    startSilenceMonitor();
    updateMicUi(true);
    addSystemMessage(t("recordingHint"));
  } catch (err) {
    console.error("Mic access error:", err);
    addSystemMessage(
      "Mikrofon konnte nicht verwendet werden (Berechtigungen prüfen).",
    );
  }
}

/**
 * Send recorded audio to the Worker → transcribe → send as user message.
 */
async function sendAudioForTranscription(blob) {
  try {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("language", currentLang);

    const resp = await fetch("/voice/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!resp.ok) {
      console.warn("Transcription failed:", resp.status);
      addSystemMessage(
        "Spracherkennung ist fehlgeschlagen. Bitte erneut versuchen.",
      );
      return;
    }

    const data = await resp.json();
    const text = (data.text || "").trim();
    if (!text) {
      addSystemMessage("Keine verständliche Sprachnachricht erkannt.");
      return;
    }

    // Transkript als User-Message anzeigen und an Backend schicken
    addMessageBubble("user", text);

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addSystemMessage(t("reconnectHint"));
      ensureSocket();
      return;
    }

    lastAssistantBubble = null;

    socket.send(
      JSON.stringify({ type: "user_message", text, lang: currentLang }),
    );
  } catch (err) {
    console.error("sendAudioForTranscription error:", err);
    addSystemMessage(
      "Beim Verarbeiten der Sprachnachricht ist ein Fehler aufgetreten.",
    );
  }
}

/**
 * TTS: play assistant answer as audio (only if voiceEnabled).
 */
async function speakAssistantText(text) {
  if (!text || !voiceEnabled) return;

  try {
    const response = await fetch("/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: currentLang }),
    });

    if (!response.ok) {
      console.warn("TTS request failed:", response.status);
      return;
    }

    const audioData = await response.arrayBuffer();
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (err) {
    console.error("TTS error:", err);
  }
}

/**
 * Initialize widget once DOM is ready.
 */
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

  // Language toggle, Voice toggle, Mic button
  initLanguageToggle();
  initVoiceToggle();
  applyLanguageTexts();
  initMicButton();

  // Initial greeting in current language
  addSystemMessage(t("welcome"));
}

window.addEventListener("DOMContentLoaded", initCondataChat);
