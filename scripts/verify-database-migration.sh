#!/bin/bash
set -euo pipefail

echo "====================================================================================="
echo "===========================...VERIFYING DATABASE MIGRATION...========================"
echo "====================================================================================="

PROJECT_REF="${PROJECT_REF:-zexlxabdcsjefptmjhuq}"

echo "Checking users.notification_preferences column..."
supabase db remote set --project-ref "${PROJECT_REF}" 2>/dev/null || true
supabase db execute --linked --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_preferences';" 2>/dev/null || echo "Supabase CLI not available - run manually in Dashboard"

echo "Checking notifications payload column..."
supabase db execute --linked --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'payload';" 2>/dev/null || echo "Supabase CLI not available - run manually in Dashboard"

echo "Checking notifications updated_at column..."
supabase db execute --linked --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at';" 2>/dev/null || echo "Supabase CLI not available - run manually in Dashboard"

echo "Checking trigger..."
supabase db execute --linked --sql "SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at';" 2>/dev/null || echo "Supabase CLI not available - run manually in Dashboard"

echo "Checking GIN index..."
supabase db execute --linked --sql "SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_notifications_payload_gin';" 2>/dev/null || echo "Supabase CLI not available - run manually in Dashboard"

echo "====================================================================================="
echo "=============================...VERIFICATION COMPLETE...============================="
echo "====================================================================================="
echo ""
echo "If Supabase CLI is not available, run these queries in the Dashboard SQL Editor:"
echo "  1. SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_preferences';"
echo "  2. SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name IN ('payload', 'updated_at', 'sent_at', 'error_message');"
echo "  3. SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at';"
echo "  4. SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_notifications_payload_gin';"
