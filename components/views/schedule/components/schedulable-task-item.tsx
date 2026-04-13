import type { Task } from "@/lib/types";
import { Clock, Play } from "lucide-react";

export function SchedulableTaskItem({
	task,
	onStart,
	onSchedule,
	isPending = false,
}: {
	task: Task;
	onStart?: (task: Task) => void;
	onSchedule?: (task: Task) => void;
	isPending?: boolean;
}) {
	const isCompleted = task.status === "completed";

	return (
		<div
			className={`
				group flex items-center gap-2 p-2 rounded-md border text-sm
				${
					isPending
						? "bg-[#8b9a6b]/10 border-[#8b9a6b] ring-1 ring-[#8b9a6b]"
						: "bg-card border-border hover:bg-accent/50"
				}
        		${isCompleted ? "opacity-60" : ""}
      		`}
		>
			{/* Schedule button - tap to select block */}
			<button
				onClick={() => onSchedule?.(task)}
				className={`
					p-1.5 rounded-md shrink-0 transition-colors
					${
						isPending
							? "bg-[#8b9a6b] text-white"
							: "bg-muted hover:bg-[#8b9a6b] hover:text-white text-muted-foreground"
					}
				`}
				title="Schedule task"
			>
				<Clock className="w-4 h-4" />
			</button>

			<div className="flex-1 min-w-0">
				<p
					className={`truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}
				>
					{task.text}
				</p>
			</div>

			{/* Play button - always visible for unscheduled tasks */}
			{!isCompleted && onStart && (
				<button
					onClick={() => onStart(task)}
					className="p-1.5 hover:bg-accent rounded-md shrink-0 text-[#8b9a6b]"
					title="Start task now"
				>
					<Play className="w-4 h-4 fill-current" />
				</button>
			)}
		</div>
	);
}
