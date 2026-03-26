import { useEffect, useRef, useCallback } from "react";
import type { AchievementPending } from "@/lib/types";

/**
 * Custom hook to manage achievement toast auto-dismiss timer
 */
export function useAchievementTimer(
	achievementPending: AchievementPending | null,
	onTimeout: () => void,
) {
	const achievementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	useEffect(() => {
		if (achievementPending) {
			achievementTimerRef.current = setTimeout(onTimeout, 6000);
		} else {
			if (achievementTimerRef.current) {
				clearTimeout(achievementTimerRef.current);
			}
		}
		return () => {
			if (achievementTimerRef.current) {
				clearTimeout(achievementTimerRef.current);
			}
		};
	}, [achievementPending, onTimeout]);

	return useCallback(() => {
		if (achievementTimerRef.current) {
			clearTimeout(achievementTimerRef.current);
		}
		achievementTimerRef.current = setTimeout(onTimeout, 6000);
	}, [onTimeout]);
}
