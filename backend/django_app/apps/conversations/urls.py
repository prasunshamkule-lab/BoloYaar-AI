"""
Conversations App — URL Configuration
"""

from django.urls import path
from .views import ConversationListCreateView, ConversationDetailView, MessageListView, SendTextMessageView

urlpatterns = [
    path("", ConversationListCreateView.as_view(), name="conversation-list"),
    path("send-text/", SendTextMessageView.as_view(), name="send-text"),
    path("<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("<uuid:conversation_id>/messages/", MessageListView.as_view(), name="message-list"),
]
