/**********************************************************************
 * condata AAI Chatbot – Voice + Realtime Script
 * Full Voice Pipeline:
 *  - AudioWorklet
 *  - Local VAD
 *  - Realtime WebSocket
 *  - Live Partial Transcripts
 *  - Auto End-of-Speech (1.5s)
 *  - Mic-States (off/on/recording)
 *  - Automatic TTS voice="verse"
 *********************************************************************/

let audioContext = null;
let processorNode = null;
let micStream = null;
let micEnabled = false;

let websocket = null;

// UI elements
const root = document.getElementById("condata-chat-root");
const launcher = document.getElementById("condata-chat-launcher");
const windowEl = document.getElementById("condata-chat-window");
const closeBtn = document.getElementById("condata-chat-close");
const messagesEl = document.getElementById("condata-chat-messages");
const inputEl = document.getElementById("condata-chat-input");
const sendBtn = document.getElementById("condata-chat-send");
const micBtn = document.getElementById("condata-chat-mic");

// Lang buttons
const langDE = document.getElementById("lang-de");
const langEN = document.getElementById("lang-en");

let currentLang = "de";

// Voice Logic
let lastSpeechTime = 0;
const END_OF_SPEECH_DELAY = 1500; // 1.5 seconds

let sendingInProgress = false;

/**********************************************************************
 * UI controls
 *********************************************************************/
launcher.onclick = () => {
    root.classList.add("is-open");
};

closeBtn.onclick = () => {
    root.classList.remove("is-open");
};

sendBtn.onclick = sendTextMessage;

/**********************************************************************
 * Language toggle
 *********************************************************************/
langDE.onclick = () => {
    currentLang = "de";
    langDE.classList.add("active");
    langEN.classList.remove("active");
    inputEl.placeholder = "Ihre Frage an den Chatbot…";
};

langEN.onclick = () => {
    currentLang = "en";
    langEN.classList.add("active");
    langDE.classList.remove("active");
    inputEl.placeholder = "Your question for the chatbot…";
};

/**********************************************************************
 * Start microphone + AudioWorklet
 *********************************************************************/
async function startMicrophone() {
    if (micEnabled) {
        stopMicrophone();
        return;
    }

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Mic error:", err);
        return;
    }

    audioContext = new AudioContext();
    await audioContext.audioWorklet.addModule(window.CONDATA_WORKLET_URL);

    const source = audioContext.createMediaStreamSource(micStream);
    processorNode = new AudioWorkletNode(audioContext, "condata-audio-processor");

    source.connect(processorNode).connect(audioContext.destination);

    processorNode.port.onmessage = handleWorkletMessage;

    micEnabled = true;
    micBtn.classList.remove("off");
    micBtn.classList.add("on");

    initRealtimeWebSocket();

    console.log("Microphone started");
}

/**********************************************************************
 * Stop microphone
 *********************************************************************/
function stopMicrophone() {
    micEnabled = false;
    micBtn.classList.remove("on", "recording");
    micBtn.classList.add("off");

    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    if (websocket) {
        websocket.close();
    }

    console.log("Microphone stopped");
}

/**********************************************************************
 * Mic button toggle
 *********************************************************************/
micBtn.onclick = () => {
    if (micEnabled) stopMicrophone();
    else startMicrophone();
};

/**********************************************************************
 * Handle messages from AudioWorklet
 *********************************************************************/
function handleWorkletMessage(evt) {
    const msg = evt.data;

    if (msg.type === "speech-start") {
        micBtn.classList.remove("on");
        micBtn.classList.add("recording");
    }

    if (msg.type === "speech-end") {
        micBtn.classList.remove("recording");
        micBtn.classList.add("on");

        lastSpeechTime = performance.now();
    }

    if (msg.type === "audio-frame") {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(
                JSON.stringify({
                    type: "input_audio_buffer.append",
                    audio: Array.from(msg.pcm)
                })
            );
        }

        if (performance.now() - lastSpeechTime > END_OF_SPEECH_DELAY) {
            if (!sendingInProgress && inputEl.value.trim() !== "") {
                sendTextMessage();
            }
        }
    }
}

/**********************************************************************
 * Init WebSocket to OpenAI Realtime
 *********************************************************************/
function initRealtimeWebSocket() {
    if (websocket) websocket.close();

    websocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
    });

    websocket.onopen = () => console.log("Realtime WebSocket connected");
    websocket.onclose = () => console.log("Realtime WebSocket closed");
    websocket.onerror = err => console.log("WebSocket error:", err);

    websocket.onmessage = evt => {
        let msg = {};
        try { msg = JSON.parse(evt.data); }
        catch (err) { return; }

        handleRealtimeEvent(msg);
    };
}

/**********************************************************************
 * Handle Realtime WebSocket Events
 *********************************************************************/
function handleRealtimeEvent(msg) {
    if (msg.type === "input_text.delta") {
        inputEl.value = msg.delta;
    }

    if (msg.type === "input_text.completed") {
        sendTextMessage();
    }

    if (msg.type === "response.text.delta") {
        appendAIMessage(msg.delta, false);
    }

    if (msg.type === "response.completed") {
        playTTS(msg.response.output_text);
        appendAIMessage("\n", true);
    }
}

/**********************************************************************
 * Send text message to Realtime API
 *********************************************************************/
function sendTextMessage() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

    const text = inputEl.value.trim();
    if (text === "") return;

    sendingInProgress = true;

    appendUserMessage(text);

    websocket.send(
        JSON.stringify({
            type: "input_text",
            text: text,
            language: currentLang
        })
    );

    inputEl.value = "";
    sendingInProgress = false;
}

/**********************************************************************
 * Message UI helpers
 *********************************************************************/
function appendUserMessage(text) {
    const el = document.createElement("div");
    el.className = "condata-msg user";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendAIMessage(text, isFinal) {
    const el = document.createElement("div");
    el.className = "condata-msg ai";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (isFinal) messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**********************************************************************
 * Automatic TTS
 *********************************************************************/
async function playTTS(text) {
    try {
        const resp = await fetch("/voice/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, lang: currentLang })
        });

        const wavData = await resp.arrayBuffer();

        const audioBuffer = await audioContext.decodeAudioData(wavData);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (err) {
        console.error("TTS playback error:", err);
    }
}
