import { useRef, useCallback, useState } from "react";

interface UseLongPressOptions {
	onLongPress: (e: React.TouchEvent) => void;
	delay?: number;
}

export function useLongPress({
	onLongPress,
	delay = 1000,
}: UseLongPressOptions) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const movedRef = useRef(false);
	const [isDragging, setIsDragging] = useState(false);

	const start = useCallback(
		(e: React.TouchEvent) => {
			movedRef.current = false;
			setIsDragging(true);
			timerRef.current = setTimeout(() => {
				if (!movedRef.current) onLongPress(e);
			}, delay);
		},
		[onLongPress, delay],
	);

	const cancel = useCallback((_e?: React.TouchEvent) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setIsDragging(false);
	}, []);

	const move = useCallback(
		(_e?: React.TouchEvent) => {
			movedRef.current = true;
			cancel();
		},
		[cancel],
	);
	return { onTouchStart: start, onTouchEnd: cancel, onTouchMove: move, isDragging };
}
