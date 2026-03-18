-- Create tasks table for AF4 Autofocus system
-- No RLS since this is a single-user local app without auth

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in-progress', 'completed', 'dismissed')),
  page_number INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_ms BIGINT NOT NULL DEFAULT 0,
  re_entered_from UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create app_state table (singleton for app-wide state)
CREATE TABLE IF NOT EXISTS app_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_page INTEGER NOT NULL DEFAULT 1,
  page_size INTEGER NOT NULL DEFAULT 30,
  last_pass_had_no_action BOOLEAN NOT NULL DEFAULT FALSE,
  working_on_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_start_time TIMESTAMPTZ,
  timer_state TEXT NOT NULL DEFAULT 'idle' CHECK (timer_state IN ('idle', 'running', 'paused', 'stopped')),
  current_session_ms BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_page_number ON tasks(page_number);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
CREATE INDEX IF NOT EXISTS idx_tasks_added_at ON tasks(added_at);

-- Insert default app state if not exists
INSERT INTO app_state (id, current_page, page_size, last_pass_had_no_action, timer_state, current_session_ms)
VALUES ('00000000-0000-0000-0000-000000000001', 1, 30, FALSE, 'idle', 0)
ON CONFLICT (id) DO NOTHING;
