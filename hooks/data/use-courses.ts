import useSWR from "swr";
import {
	getCourses,
	updateCourse,
	addCourse,
	deleteCourse,
	type Course,
} from "@/lib/db/courses";
import { useCallback } from "react";
import { useUserId } from "@/hooks/state/use-user-id";

const CACHE_KEY = "af4_courses_cache";

function getCoursesCache(): Course[] | null {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function setCoursesCache(courses: Course[]) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(courses));
	} catch {}
}

export function useCourses() {
	const userId = useUserId();

	const cachedCourses = getCoursesCache();
	const hasCachedCourses =
		Array.isArray(cachedCourses) && cachedCourses.length > 0;

	const {
		data: courses = [],
		mutate,
		isLoading,
	} = useSWR<Course[]>(userId ? `courses-${userId}` : null, getCourses, {
		refreshInterval: 0,
		fallbackData: cachedCourses ?? undefined,
		onSuccess(data) {
			setCoursesCache(data);
		},
		revalidateOnMount: !hasCachedCourses,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	});

	const handleUpdate = useCallback(
		async (id: string, updates: Partial<Course>) => {
			mutate(
				courses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
				false,
			);
			await updateCourse(id, updates);
			await mutate();
		},
		[courses, mutate],
	);

	const handleAdd = useCallback(
		async (course: Omit<Course, "id" | "created_at" | "updated_at">) => {
			await addCourse(course);
			await mutate();
		},
		[mutate],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			mutate(
				courses.filter((c) => c.id !== id),
				false,
			);
			await deleteCourse(id);
			await mutate();
		},
		[courses, mutate],
	);

	const handleStatusChange = useCallback(
		async (id: string, status: Course["status"]) => {
			const updates: Partial<Course> = { status };
			if (status === "completed") {
				updates.progress = 100;
				updates.completion_date = new Date().toISOString();
			}
			await handleUpdate(id, updates);
		},
		[handleUpdate],
	);

	return {
		courses,
		isLoading: hasCachedCourses ? false : isLoading,
		handleUpdate,
		handleAdd,
		handleDelete,
		handleStatusChange,
	};
}
