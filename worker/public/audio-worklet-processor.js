/**
 * -------------------------------------------------------------
 *  condata AAI Chatbot – AudioWorklet Voice Processor
 *  High-precision PCM handler + RMS/VAD + Noise Floor Tracking
 * -------------------------------------------------------------
 */

class CondataAudioProcessor extends AudioWorkletProcessor {

  constructor() {
    super();

    /* Noise floor baseline */
    this.noiseFloor = 0.001;

    /* VAD parameters */
    this.volumeThreshold = 0.015;   // Mindestlautstärke für Sprache
    this.minSpeechFrames = 5;       // Anzahl Frames bevor "speech.start"
    this.speechFrameCount = 0;

    /* Internal buffer */
    this.frameSize = 128;
    this.sampleRate = sampleRate;

    this.port.postMessage({ type: "worklet-ready" });
  }

  /**
   * RMS-Berechnung als Grundlage für Voice Activity Detection
   */
  computeRMS(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    return Math.sqrt(sum / input.length);
  }

  /**
   * Hauptverarbeitung jedes Audio-Frames
   */
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const rms = this.computeRMS(channelData);

    /* Dynamischer Noise Floor */
    this.noiseFloor = (this.noiseFloor * 0.9) + (rms * 0.1);

    const isSpeech = rms > (this.noiseFloor * 3) && rms > this.volumeThreshold;

    if (isSpeech) {
      this.speechFrameCount++;

      if (this.speechFrameCount === this.minSpeechFrames) {
        this.port.postMessage({
          type: "speech-start",
          rms: rms,
        });
      }

    } else {
      /* Keine Sprache erkannt */
      if (this.speechFrameCount >= this.minSpeechFrames) {
        this.port.postMessage({
          type: "speech-end",
          rms: rms,
        });
      }

      this.speechFrameCount = 0;
    }

    /**
     * Rohdaten an das Frontend schicken (Float32 PCM)
     */
    this.port.postMessage({
      type: "audio-frame",
      pcm: channelData
    });

    return true;
  }
}

registerProcessor("condata-audio-processor", CondataAudioProcessor);
