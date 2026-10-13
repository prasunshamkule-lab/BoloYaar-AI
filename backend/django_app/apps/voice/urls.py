"""
Voice App — URL Configuration
"""

from django.urls import path
from .views import VoicePipelineView, HealthCheckView

urlpatterns = [
    path("process/", VoicePipelineView.as_view(), name="voice-process"),
    path("health/", HealthCheckView.as_view(), name="voice-health"),
]
