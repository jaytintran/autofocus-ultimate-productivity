import { useState, useEffect, useRef } from "react";
import type { AchievementPending } from "@/lib/types";

const ACHIEVEMENT_PLACEHOLDERS = [
	"What went better than expected?",
	"Any unexpected wins?",
	"Anything worth noting?",
	"A small win? Write it down.",
	"Did anything surprise you?",
	"The smallest step you achieved?",
];

/**
 * Custom hook to manage achievement toast placeholder text rotation
 */
export function useAchievementPlaceholder(
	achievementPending: AchievementPending | null,
) {
	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	const placeholderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	useEffect(() => {
		if (achievementPending) {
			setPlaceholderIndex(() =>
				Math.floor(Math.random() * ACHIEVEMENT_PLACEHOLDERS.length),
			);
			placeholderIntervalRef.current = setInterval(() => {
				setPlaceholderIndex((i) => (i + 1) % ACHIEVEMENT_PLACEHOLDERS.length);
			}, 5000);
		} else {
			if (placeholderIntervalRef.current) {
				clearInterval(placeholderIntervalRef.current);
			}
		}
		return () => {
			if (placeholderIntervalRef.current) {
				clearInterval(placeholderIntervalRef.current);
			}
		};
	}, [achievementPending]);

	return placeholderIndex;
}

export { ACHIEVEMENT_PLACEHOLDERS };
