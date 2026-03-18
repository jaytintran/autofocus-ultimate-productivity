export type TaskStatus = 'active' | 'in-progress' | 'completed' | 'dismissed'
export type TimerState = 'idle' | 'running' | 'paused' | 'stopped'

export interface Task {
  id: string
  text: string
  status: TaskStatus
  page_number: number
  position: number
  added_at: string
  completed_at: string | null
  total_time_ms: number
  re_entered_from: string | null
  created_at: string
  updated_at: string
}

export interface AppState {
  id: string
  current_page: number
  page_size: number
  last_pass_had_no_action: boolean
  working_on_task_id: string | null
  session_start_time: string | null
  timer_state: TimerState
  current_session_ms: number
  created_at: string
  updated_at: string
}

export interface TaskWithTimer extends Task {
  isWorking: boolean
}
