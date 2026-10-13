"""
Voice App — Views
Django acts as a gateway to the Flask AI microservice.
It handles auth, saves messages to DB, then proxies to Flask.
"""

import json
import logging
import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.conversations.models import Conversation, Message

logger = logging.getLogger("boloyaarai.voice")
FLASK_AI_URL = settings.FLASK_AI_URL


class VoicePipelineView(APIView):
    """
    POST /api/voice/process/
    Accepts: multipart/form-data
      - audio: audio file (WebM/WAV/MP3)
      - conversation_id: UUID (optional — creates new if not provided)

    Pipeline:
      1. Resolve or create conversation
      2. Build conversation history from DB
      3. Forward audio + history to Flask AI
      4. Save user transcript + AI response to DB
      5. Return result with audio URL
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # 1. Resolve conversation
        conversation_id = request.data.get("conversation_id")
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=user)
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation not found."}, status=404)
        else:
            conversation = Conversation.objects.create(user=user)

        # 2. Get audio file
        if "audio" not in request.FILES:
            return Response({"error": "No audio file provided."}, status=400)
        audio_file = request.FILES["audio"]

        # 3. Build conversation history (last 10 messages for context)
        recent_messages = conversation.messages.order_by("-created_at")[:10]
        history = [
            {"role": m.role, "content": m.content}
            for m in reversed(list(recent_messages))
        ]

        # 4. Call Flask AI voice pipeline
        try:
            flask_response = requests.post(
                f"{FLASK_AI_URL}/api/voice-pipeline",
                files={"audio": (audio_file.name, audio_file.read(), audio_file.content_type)},
                data={
                    "conversation_history": json.dumps(history),
                    "system_prompt": request.data.get("system_prompt", ""),
                },
                timeout=180,
            )
            flask_response.raise_for_status()
            result = flask_response.json()
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "AI service is unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except requests.exceptions.Timeout:
            return Response(
                {"error": "AI service timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Flask AI error: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        transcript = result.get("transcript", "")
        ai_response = result.get("response", "")
        audio_url = result.get("audio_url")

        # 5. Save messages to DB
        if transcript:
            Message.objects.create(
                conversation=conversation,
                role="user",
                content=transcript,
                audio_transcript=transcript,
            )
        if ai_response:
            Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=ai_response,
            )

        # Auto-title from first user message
        if conversation.title == "New Conversation" and transcript:
            conversation.title = transcript[:80]
            conversation.save(update_fields=["title"])

        # Keep audio_url as relative path so it routes through Django proxy on production
        # audio_url is already /api/tts-audio/<id> from Flask

        return Response({
            "conversation_id": str(conversation.id),
            "conversation_title": conversation.title,
            "transcript": transcript,
            "response": ai_response,
            "audio_url": audio_url,
        })


class HealthCheckView(APIView):
    """GET /api/voice/health/ — Check Flask AI service health."""
    permission_classes = []

    def get(self, request):
        try:
            r = requests.get(f"{FLASK_AI_URL}/health", timeout=5)
            r.raise_for_status()
            return Response({"django": "ok", "flask_ai": r.json()})
        except Exception as e:
            return Response(
                {"django": "ok", "flask_ai": "unreachable", "error": str(e)},
                status=503,
            )
