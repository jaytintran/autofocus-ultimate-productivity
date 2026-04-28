-- ============================================================
-- Add note and note_entries fields to tasks table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add note field for completion notes/achievements
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL;

-- Add note_entries field for session log entries (stored as JSON)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS note_entries TEXT DEFAULT NULL;

-- Add source field to distinguish between tasks and logged activities
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'task';

-- Add due_date field for task scheduling
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NULL;

-- Add pamphlet_id field for organizing tasks into pamphlets
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pamphlet_id UUID DEFAULT NULL;

-- Add scheduled_at field for scheduled tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- Add user_id field for multi-user support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Add index for pamphlet_id
CREATE INDEX IF NOT EXISTS idx_tasks_pamphlet_id ON tasks(pamphlet_id) WHERE pamphlet_id IS NOT NULL;

-- Add index for due_date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Add last_pass_had_no_action field to app_state
ALTER TABLE app_state ADD COLUMN IF NOT EXISTS last_pass_had_no_action BOOLEAN DEFAULT FALSE;

-- Add user_id to app_state
ALTER TABLE app_state ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for user_id in app_state
CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON app_state(user_id);
