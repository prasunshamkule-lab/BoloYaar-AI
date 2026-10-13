/**
 * BoloYaar AI — Voice Recording Module
 * Handles microphone access, recording, waveform visualization.
 */

const VOICE = {
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  isProcessing: false,
  animationFrameId: null,
  analyser: null,
  stream: null,
  recordingTimer: null,

  // ---- Waveform visualizer ----
  startWaveform(stream) {
    const canvas = document.getElementById('waveform-canvas');
    const ctx = canvas.getContext('2d');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    document.getElementById('waveform-container').classList.add('visible');

    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barWidth = (W / bufferLength) * 2.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * H;
        const gradient = ctx.createLinearGradient(0, H, 0, H - barHeight);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#06b6d4');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, H - barHeight, barWidth - 1, barHeight, 2);
        ctx.fill();
        x += barWidth + 1;
      }
    };
    draw();
  },

  stopWaveform() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const canvas = document.getElementById('waveform-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('waveform-container').classList.remove('visible');
  },

  // ---- Recording ----
  async startRecording() {
    if (this.isRecording || this.isProcessing) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      });
    } catch (err) {
      showToast('Microphone access denied. Please allow microphone access.', 'error');
      return;
    }

    this.audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this._onRecordingStop();
    this.mediaRecorder.start(100); // collect in 100ms chunks

    this.isRecording = true;
    this._setUIRecording(true);
    this.startWaveform(this.stream);

    // Auto-stop after max duration
    this.recordingTimer = setTimeout(() => {
      if (this.isRecording) this.stopRecording();
    }, CONFIG.MAX_RECORDING_SECONDS * 1000);
  },

  stopRecording() {
    if (!this.isRecording) return;
    clearTimeout(this.recordingTimer);
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.stopWaveform();
  },

  async _onRecordingStop() {
    if (this.audioChunks.length === 0) {
      this._setUIIdle();
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];

    this.isProcessing = true;
    this._setUIProcessing();

    // Send to backend
    await CHAT.sendAudioMessage(audioBlob);

    this.isProcessing = false;
    this._setUIIdle();
  },

  // ---- UI State ----
  _setUIRecording(recording) {
    const micBtn = document.getElementById('mic-button');
    const micIcon = document.getElementById('mic-icon');
    const stopIcon = document.getElementById('stop-icon');
    const voiceStatus = document.getElementById('voice-status');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const micWrapper = document.querySelector('.mic-button-wrapper');

    micBtn.classList.toggle('recording', recording);
    micBtn.setAttribute('aria-pressed', recording);
    micBtn.setAttribute('aria-label', recording ? 'Recording — tap to stop' : 'Press to speak');
    micIcon.classList.toggle('hidden', recording);
    stopIcon.classList.toggle('hidden', !recording);

    voiceStatus.textContent = recording ? 'Listening...' : 'Tap to speak';
    voiceStatus.className = `voice-status${recording ? ' recording' : ''}`;

    micWrapper.classList.toggle('recording', recording);
    statusDot.className = `status-dot${recording ? ' recording' : ''}`;
    statusText.textContent = recording ? 'Recording' : 'Ready';
  },

  _setUIProcessing() {
    const micBtn = document.getElementById('mic-button');
    const voiceStatus = document.getElementById('voice-status');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    micBtn.classList.remove('recording');
    micBtn.classList.add('processing');
    micBtn.disabled = true;

    voiceStatus.textContent = 'Processing...';
    voiceStatus.className = 'voice-status processing';
    statusDot.className = 'status-dot processing';
    statusText.textContent = 'Thinking...';
  },

  _setUIIdle() {
    const micBtn = document.getElementById('mic-button');
    const micIcon = document.getElementById('mic-icon');
    const stopIcon = document.getElementById('stop-icon');
    const voiceStatus = document.getElementById('voice-status');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const micWrapper = document.querySelector('.mic-button-wrapper');

    micBtn.classList.remove('recording', 'processing');
    micBtn.disabled = false;
    micBtn.setAttribute('aria-pressed', 'false');
    micIcon.classList.remove('hidden');
    stopIcon.classList.add('hidden');

    voiceStatus.textContent = 'Tap to speak';
    voiceStatus.className = 'voice-status';
    micWrapper.classList.remove('recording');
    statusDot.className = 'status-dot';
    statusText.textContent = 'Ready';
  },
};

// ---- TTS Audio Playback ----
let _ttsAudio = null;

function playAudio(url) {
  stopAudio();
  _ttsAudio = document.getElementById('tts-audio');
  _ttsAudio.src = url;
  _ttsAudio.play().catch(() => {});

  const playingIndicator = document.getElementById('playing-indicator');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  playingIndicator.classList.remove('hidden');
  statusDot.className = 'status-dot speaking';
  statusText.textContent = 'Speaking';

  _ttsAudio.onended = () => {
    playingIndicator.classList.add('hidden');
    statusDot.className = 'status-dot';
    statusText.textContent = 'Ready';
  };
}

function stopAudio() {
  if (_ttsAudio) {
    _ttsAudio.pause();
    _ttsAudio.currentTime = 0;
    _ttsAudio.src = '';
  }
  document.getElementById('playing-indicator').classList.add('hidden');
}
