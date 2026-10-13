"""
Conversations App — Serializers
"""

from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "audio_transcript", "created_at"]
        read_only_fields = ["id", "created_at"]


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.ReadOnlyField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "message_count", "last_message", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if last:
            return {"role": last.role, "content": last.content[:100], "created_at": last.created_at}
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.ReadOnlyField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "messages", "message_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
