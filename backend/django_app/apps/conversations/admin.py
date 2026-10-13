"""
Conversations App — Admin
"""

from django.contrib import admin
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["id", "created_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "message_count", "is_active", "updated_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["title", "user__email"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["role", "conversation", "content_preview", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["content", "conversation__title"]

    def content_preview(self, obj):
        return obj.content[:80]
    content_preview.short_description = "Content"
