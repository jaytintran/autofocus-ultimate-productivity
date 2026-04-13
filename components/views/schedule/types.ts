import type { Task, TimeBlock } from "@/lib/types";

export interface ScheduleViewProps {
	date: Date;
	timeBlocks: TimeBlock[];
	tasks: Task[];
	completedTasks: Task[];
	onScheduleTask: (taskId: string, scheduledAt: string) => Promise<void>;
	onUnscheduleTask: (taskId: string) => Promise<void>;
	onCreateBlock: (
		block: Omit<TimeBlock, "id" | "user_id" | "created_at" | "updated_at">,
	) => Promise<TimeBlock>;
	onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>;
	onDeleteBlock: (id: string) => Promise<void>;
	onStartTask: (task: Task) => void;
	onDateChange: (date: Date) => void;
}

export interface BlockPosition {
	top: number;
	height: number;
}

export interface LayoutedBlock {
	block: TimeBlock;
	column: number;
	totalColumns: number;
}

export interface ContextMenuState {
	x: number;
	y: number;
	block: TimeBlock | null;
}
