"""
BoloYaar AI — Django URL Configuration
"""

import os
import mimetypes
import requests
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, FileResponse

@csrf_exempt
def proxy_tts_audio(request, audio_id):
    """Proxy audio playback request to Flask AI."""
    try:
        url = f"{settings.FLASK_AI_URL}/api/tts-audio/{audio_id}"
        resp = requests.get(url, timeout=30)
        return HttpResponse(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "audio/mpeg")
        )
    except Exception as e:
        return HttpResponse(str(e), status=502)

@csrf_exempt
def proxy_llm(request):
    """Proxy direct LLM chat request to Flask AI."""
    try:
        url = f"{settings.FLASK_AI_URL}/api/llm"
        resp = requests.post(
            url,
            data=request.body,
            headers={"Content-Type": "application/json"},
            timeout=120
        )
        return HttpResponse(
            resp.content,
            status=resp.status_code,
            content_type="application/json"
        )
    except Exception as e:
        return HttpResponse(str(e), status=502)

@csrf_exempt
def proxy_tts(request):
    """Proxy TTS generation request to Flask AI."""
    try:
        url = f"{settings.FLASK_AI_URL}/api/tts"
        resp = requests.post(
            url,
            data=request.body,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        return HttpResponse(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "audio/mpeg")
        )
    except Exception as e:
        return HttpResponse(str(e), status=502)

def serve_frontend(request, path=""):
    """Serve static frontend files or fallback to index.html for SPA routes."""
    clean_path = request.path_info.lstrip("/")
    if clean_path:
        target = (settings.FRONTEND_DIR / clean_path).resolve()
        if target.is_relative_to(settings.FRONTEND_DIR) and target.is_file():
            mime_type, _ = mimetypes.guess_type(str(target))
            return FileResponse(open(target, "rb"), content_type=mime_type or "application/octet-stream")

    index_path = settings.FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(open(index_path, "rb"), content_type="text/html")
    return HttpResponse("Frontend not found. Run from project root.", status=404)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth endpoints (JWT)
    path("api/auth/", include("apps.users.urls")),

    # Conversations & chat history
    path("api/conversations/", include("apps.conversations.urls")),

    # Voice pipeline proxy (Django → Flask AI)
    path("api/voice/", include("apps.voice.urls")),

    # Flask AI microservice proxies
    re_path(r"^api/tts-audio/(?P<audio_id>[^/]+)/?$", proxy_tts_audio),
    re_path(r"^api/llm/?$", proxy_llm),
    re_path(r"^api/tts/?$", proxy_tts),

    # Frontend SPA & static files — catch all other routes
    re_path(r"^(?!admin/|static/|media/).*$", serve_frontend),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
