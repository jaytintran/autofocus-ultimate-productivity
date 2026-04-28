-- ============================================================
-- Add note_entries field to tasks table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add note_entries field for session log entries (stored as JSON)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS note_entries TEXT DEFAULT NULL;

-- Add index for tasks with note_entries
CREATE INDEX IF NOT EXISTS idx_tasks_note_entries ON tasks(id) WHERE note_entries IS NOT NULL;
