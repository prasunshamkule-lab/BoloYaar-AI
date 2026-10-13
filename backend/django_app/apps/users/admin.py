"""
Users App — Admin Registration
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "display_name", "is_active", "created_at"]
    list_filter = ["is_active", "is_staff", "preferred_language"]
    search_fields = ["email", "username", "display_name"]
    ordering = ["-created_at"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("BoloYaar AI", {"fields": ("display_name", "avatar", "preferred_language")}),
    )
