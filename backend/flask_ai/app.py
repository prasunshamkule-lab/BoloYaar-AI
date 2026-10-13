"""
BoloYaar AI — Flask AI Microservice
Handles: Speech-to-Text (Whisper), LLM inference (Ollama), Text-to-Speech (gTTS)
"""

import os
import io
import uuid
import logging
import tempfile
from pathlib import Path
from dotenv import load_dotenv

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("boloyaarai.flask")

# ---------------------------------------------------------------------------
# Lazy-loaded Whisper model (loaded once on first request)
# ---------------------------------------------------------------------------
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        model_size = os.getenv("WHISPER_MODEL_SIZE", "large-v3")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = "float16" if device == "cuda" else "int8"
        logger.info(f"Loading Whisper model: {model_size} on {device}")
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
        logger.info("Whisper model loaded successfully.")
    return _whisper_model


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "boloyaarai-flask-ai"}), 200


# ---------------------------------------------------------------------------
# Speech-to-Text endpoint
# POST /api/stt
# Accepts: multipart/form-data with audio file (field: "audio")
# Returns: { "transcript": "...", "language": "en" }
# ---------------------------------------------------------------------------
@app.route("/api/stt", methods=["POST"])
def speech_to_text():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided. Send as 'audio' field."}), 400

    audio_file = request.files["audio"]

    # Save to a temp file for Whisper
    suffix = Path(audio_file.filename).suffix if audio_file.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        model = get_whisper_model()
        segments, info = model.transcribe(tmp_path, beam_size=5)
        transcript = " ".join(segment.text.strip() for segment in segments)
        language = info.language

        logger.info(f"STT: language={language}, transcript length={len(transcript)}")

        return jsonify({
            "transcript": transcript,
            "language": language,
        }), 200

    except Exception as e:
        logger.error(f"STT error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# LLM inference endpoint
# POST /api/llm
# Body: { "messages": [...], "system_prompt": "..." }
# Returns: { "response": "..." }
# ---------------------------------------------------------------------------
@app.route("/api/llm", methods=["POST"])
def llm_inference():
    import requests as req

    data = request.get_json(silent=True) or {}
    messages = data.get("messages", [])
    system_prompt = data.get(
        "system_prompt",
        (
            "You are BoloYaar AI, a friendly and helpful AI companion. "
            "Keep your responses conversational, warm, and concise since "
            "your answers will be spoken aloud. Avoid markdown formatting, "
            "bullet points, or long lists — speak naturally."
        ),
    )

    if not messages:
        return jsonify({"error": "No messages provided."}), 400

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    # Build Ollama chat payload
    ollama_messages = [{"role": "system", "content": system_prompt}] + messages

    try:
        response = req.post(
            f"{ollama_url}/api/chat",
            json={
                "model": model,
                "messages": ollama_messages,
                "stream": False,
            },
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()
        ai_text = result["message"]["content"].strip()
        logger.info(f"LLM response length: {len(ai_text)} chars")
        return jsonify({"response": ai_text}), 200

    except req.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to Ollama. Make sure `ollama serve` is running."
        }), 503
    except Exception as e:
        logger.error(f"LLM error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Text-to-Speech endpoint
# POST /api/tts
# Body: { "text": "...", "language": "en" }
# Returns: audio/mpeg stream (MP3)
# ---------------------------------------------------------------------------
@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    from gtts import gTTS

    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    language = data.get("language", os.getenv("TTS_LANGUAGE", "en"))
    slow = str(data.get("slow", os.getenv("TTS_SLOW", "False"))).lower() == "true"

    if not text:
        return jsonify({"error": "No text provided."}), 400

    try:
        tts = gTTS(text=text, lang=language, slow=slow)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        logger.info(f"TTS: lang={language}, text_length={len(text)}")

        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="response.mp3",
        )

    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Combined voice pipeline endpoint
# POST /api/voice-pipeline
# Accepts: multipart/form-data
#   - audio: audio file
#   - conversation_history: JSON string of previous messages (optional)
#   - system_prompt: custom system prompt (optional)
# Returns: { "transcript": "...", "response": "...", "audio_url": "..." }
# Note: audio_url is a one-time URL to fetch the TTS audio
# ---------------------------------------------------------------------------
_tts_cache = {}  # In-memory cache: uuid -> bytes

@app.route("/api/voice-pipeline", methods=["POST"])
def voice_pipeline():
    import requests as req
    from gtts import gTTS

    # 1. Get audio
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided."}), 400

    audio_file = request.files["audio"]
    conversation_history_raw = request.form.get("conversation_history", "[]")
    system_prompt = request.form.get("system_prompt", "")

    import json
    try:
        conversation_history = json.loads(conversation_history_raw)
    except json.JSONDecodeError:
        conversation_history = []

    # 2. STT
    suffix = Path(audio_file.filename).suffix if audio_file.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        model = get_whisper_model()
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            vad_filter=True,
            initial_prompt="Conversational English and Hindi voice assistant.",
        )
        transcript = " ".join(s.text.strip() for s in segments).strip()
        detected_language = info.language
    except Exception as e:
        os.unlink(tmp_path)
        logger.error(f"STT pipeline error: {e}", exc_info=True)
        return jsonify({"error": f"STT failed: {e}"}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Filter out known Whisper silence hallucinations (e.g. Arabic/Urdu script on microphone noise)
    if any('\u0600' <= char <= '\u06FF' for char in transcript):
        logger.warning(f"Discarded Arabic/Urdu silence hallucination: {transcript}")
        transcript = ""

    if not transcript:
        return jsonify({"error": "I could not hear you clearly. Please tap the mic and speak clearly."}), 422

    # 3. LLM
    if not system_prompt:
        system_prompt = (
            "You are BoloYaar AI, a friendly and helpful AI companion. "
            "Keep your responses conversational, warm, and concise (1-3 sentences) "
            "since your answers will be spoken aloud. Avoid markdown formatting, "
            "bullet points, or long lists — speak naturally. "
            "Always respond in friendly English (or Hindi/Hinglish if the user asks in Hindi)."
        )

    messages = conversation_history + [{"role": "user", "content": transcript}]
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    try:
        llm_response = req.post(
            f"{ollama_url}/api/chat",
            json={
                "model": ollama_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "stream": False,
            },
            timeout=120,
        )
        llm_response.raise_for_status()
        ai_text = llm_response.json()["message"]["content"].strip()
    except req.exceptions.ConnectionError:
        return jsonify({"error": "Ollama is not running. Please start it with `ollama serve`."}), 503
    except Exception as e:
        logger.error(f"LLM pipeline error: {e}", exc_info=True)
        return jsonify({"error": f"LLM failed: {e}"}), 500

    # 4. TTS — store audio in cache, return a fetch URL
    try:
        tts = gTTS(text=ai_text, lang=detected_language if detected_language in ["en", "hi"] else "en")
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_bytes = audio_buffer.getvalue()

        audio_id = str(uuid.uuid4())
        _tts_cache[audio_id] = audio_bytes
        logger.info(f"Voice pipeline success: transcript='{transcript[:50]}...' audio_id={audio_id}")

    except Exception as e:
        logger.error(f"TTS pipeline error: {e}", exc_info=True)
        # Return text response even if TTS fails
        return jsonify({
            "transcript": transcript,
            "response": ai_text,
            "audio_url": None,
            "tts_error": str(e),
        }), 200

    return jsonify({
        "transcript": transcript,
        "response": ai_text,
        "audio_url": f"/api/tts-audio/{audio_id}",
        "language": detected_language,
    }), 200


@app.route("/api/tts-audio/<audio_id>", methods=["GET"])
def get_tts_audio(audio_id):
    """Fetch pre-generated TTS audio by ID (single-use)."""
    audio_bytes = _tts_cache.pop(audio_id, None)
    if audio_bytes is None:
        return jsonify({"error": "Audio not found or already fetched."}), 404
    return send_file(
        io.BytesIO(audio_bytes),
        mimetype="audio/mpeg",
        as_attachment=False,
        download_name="response.mp3",
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    logger.info(f"Starting BoloYaar Flask AI service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False, threaded=True)
