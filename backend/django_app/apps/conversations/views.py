"""
Conversations App — Views
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
)


class ConversationListCreateView(generics.ListCreateAPIView):
    """GET /api/conversations/ — List user's conversations.
       POST /api/conversations/ — Create a new conversation."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET /api/conversations/<id>/ — Retrieve conversation with all messages.
       PATCH — Update title.
       DELETE — Soft-delete."""
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationDetailSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        conversation = self.get_object()
        conversation.is_active = False
        conversation.save()
        return Response({"message": "Conversation deleted."}, status=status.HTTP_200_OK)


class MessageListView(generics.ListAPIView):
    """GET /api/conversations/<id>/messages/ — List all messages in a conversation."""
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            conversation__id=self.kwargs["conversation_id"],
            conversation__user=self.request.user,
        )


class SendTextMessageView(generics.GenericAPIView):
    """
    POST /api/conversations/send-text/
    Saves user message, requests LLM inference, saves AI response,
    and returns conversation details.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "Content cannot be empty."}, status=400)

        conversation_id = request.data.get("conversation_id")
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=user)
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation not found."}, status=404)
        else:
            conversation = Conversation.objects.create(
                user=user,
                title=content[:80],
            )

        # Save user message
        Message.objects.create(
            conversation=conversation,
            role="user",
            content=content,
        )

        if conversation.title == "New Conversation":
            conversation.title = content[:80]
            conversation.save(update_fields=["title"])

        # Build history
        recent_messages = conversation.messages.order_by("-created_at")[:10]
        history = [
            {"role": m.role, "content": m.content}
            for m in reversed(list(recent_messages))
        ]

        import requests
        from django.conf import settings
        flask_url = getattr(settings, "FLASK_AI_URL", "http://127.0.0.1:5000")
        try:
            resp = requests.post(
                f"{flask_url}/api/llm",
                json={"messages": history},
                timeout=90,
            )
            resp.raise_for_status()
            ai_text = resp.json().get("response", "")
        except Exception as e:
            return Response({"error": "AI service is temporarily busy. Please try again."}, status=503)

        # Save assistant message
        if ai_text:
            Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=ai_text,
            )

        conversation.save()

        return Response({
            "conversation_id": str(conversation.id),
            "conversation_title": conversation.title,
            "response": ai_text,
        })

