#!/usr/bin/env python
"""
Create initial migrations for all custom apps.
Run this once after setting up the project.
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'boloyaarai_project.settings')

import django
django.setup()

from django.core.management import call_command

print("Creating migrations...")
call_command('makemigrations', 'users')
call_command('makemigrations', 'conversations')
call_command('makemigrations', 'voice')
print("Running migrate...")
call_command('migrate')
print("Done! ✅")
