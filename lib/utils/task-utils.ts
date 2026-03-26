import type { PagedTaskLike, TaskPlacement } from "../types";

const DEFAULT_TASK_CAPACITY = 12;

/**
 * Calculate the next placement for a new task based on current tasks and capacity
 */
export function calculateNextTaskPlacement(
	tasks: PagedTaskLike[],
	pageCapacity: number = DEFAULT_TASK_CAPACITY,
): TaskPlacement {
	const lastPageNumber = tasks.length > 0 
		? Math.max(...tasks.map((task) => task.page_number)) 
		: 1;
	const lastPageTasks = tasks.filter(
		(task) => task.page_number === lastPageNumber,
	);
	const normalizedCapacity = Math.max(1, pageCapacity);

	if (lastPageTasks.length >= normalizedCapacity) {
		return {
			pageNumber: lastPageNumber + 1,
			position: 0,
		};
	}

	return {
		pageNumber: lastPageNumber,
		position: lastPageTasks.length > 0
			? Math.max(...lastPageTasks.map((task) => task.position)) + 1
			: 0,
	};
}

/**
 * Calculate shifted positions for all tasks when a new task is inserted at the beginning
 */
export function calculateShiftedPositions(
	tasks: PagedTaskLike[],
	offset: number = 1,
	pageCapacity: number = DEFAULT_TASK_CAPACITY,
): PagedTaskLike[] {
	return tasks.map((task, index) => ({
		page_number: Math.floor((index + offset) / pageCapacity) + 1,
		position: (index + offset) % pageCapacity,
	}));
}

/**
 * Calculate re-indexed positions for a sorted list of tasks
 */
export function calculateReindexedPositions(
	tasks: Array<{ id: string } & PagedTaskLike>,
	pageCapacity: number = DEFAULT_TASK_CAPACITY,
): Array<{ id: string; page_number: number; position: number }> {
	return tasks.map((task, index) => ({
		id: task.id,
		page_number: Math.floor(index / pageCapacity) + 1,
		position: index % pageCapacity,
	}));
}

/**
 * Get visible total pages from tasks array
 */
export function getVisibleTotalPages(tasks: PagedTaskLike[]): number {
	return tasks.length > 0
		? Math.max(...tasks.map((task) => task.page_number))
		: 1;
}

/**
 * Get approximate task capacity (fallback for when DOM measurement isn't available)
 */
export function getApproximateTaskCapacity(): number {
	return DEFAULT_TASK_CAPACITY;
}
