import { useState, useCallback, useRef } from "react";

/**
 * Manages swipe-to-reveal action trays on mobile.
 * Uses direct DOM manipulation for 60fps performance during drag,
 * with React state sync for snap animations.
 */
export function useSwipeReveal(isFirst: boolean, isLast: boolean) {
	const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
		null,
	);
	const [committedOffset, setCommittedOffset] = useState(0);
	const startXRef = useRef<number | null>(null);
	const startYRef = useRef<number | null>(null);
	const isEdgeSwipeRef = useRef(false);
	const slidingRef = useRef<HTMLDivElement | null>(null);

	const LEFT_TRAY_WIDTH = isFirst ? 96 : 144;
	const RIGHT_TRAY_WIDTH = isLast ? 96 : 144;
	const EDGE_THRESHOLD = 180;

	/** Update transform directly for smooth 60fps dragging */
	const updateLivePosition = useCallback((offset: number) => {
		if (slidingRef.current) {
			slidingRef.current.style.transform = `translateX(${offset}px)`;
			slidingRef.current.style.transition = "none";
		}
	}, []);

	const onTouchStart = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.touches[0];
			const rect = e.currentTarget.getBoundingClientRect();
			const touchXRelative = touch.clientX - rect.left;

			isEdgeSwipeRef.current =
				touchXRelative < EDGE_THRESHOLD ||
				touchXRelative > rect.width - EDGE_THRESHOLD;

			if (!isEdgeSwipeRef.current) {
				startXRef.current = null;
				startYRef.current = null;
				return;
			}

			startXRef.current = touch.clientX;
			startYRef.current = touch.clientY;
			updateLivePosition(committedOffset);
		},
		[committedOffset, updateLivePosition],
	);

	const onTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (
				!isEdgeSwipeRef.current ||
				startXRef.current === null ||
				startYRef.current === null
			) {
				return;
			}

			const diffX = startXRef.current - e.touches[0].clientX;
			const diffY = Math.abs(startYRef.current - e.touches[0].clientY);

			if (Math.abs(diffX) < diffY + 15) return;

			let newOffset = -diffX;

			if (swipeDirection === "left" || (!swipeDirection && newOffset < 0)) {
				newOffset = Math.max(-LEFT_TRAY_WIDTH, Math.min(0, newOffset));
			} else if (
				swipeDirection === "right" ||
				(!swipeDirection && newOffset > 0)
			) {
				newOffset = Math.min(RIGHT_TRAY_WIDTH, Math.max(0, newOffset));
			}

			updateLivePosition(newOffset);
		},
		[swipeDirection, LEFT_TRAY_WIDTH, RIGHT_TRAY_WIDTH, updateLivePosition],
	);

	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (!isEdgeSwipeRef.current || startXRef.current === null) {
				isEdgeSwipeRef.current = false;
				return;
			}

			const diffX = startXRef.current - e.changedTouches[0].clientX;
			const diffY = Math.abs(startYRef.current! - e.changedTouches[0].clientY);
			const isMostlyHorizontal = Math.abs(diffX) > diffY + 25;

			let finalDirection: "left" | "right" | null = null;
			let finalOffset = 0;

			if (isMostlyHorizontal) {
				if (diffX > 55) {
					finalDirection = "left";
					finalOffset = -LEFT_TRAY_WIDTH;
				} else if (diffX < -55) {
					finalDirection = "right";
					finalOffset = RIGHT_TRAY_WIDTH;
				}
			}

			setSwipeDirection(finalDirection);
			setCommittedOffset(finalOffset);

			if (slidingRef.current) {
				slidingRef.current.style.transition =
					"transform 180ms cubic-bezier(0.25, 0.1, 0.25, 1)";
				slidingRef.current.style.transform = `translateX(${finalOffset}px)`;
			}

			startXRef.current = null;
			startYRef.current = null;
			isEdgeSwipeRef.current = false;
		},
		[LEFT_TRAY_WIDTH, RIGHT_TRAY_WIDTH],
	);

	const close = useCallback(() => {
		setSwipeDirection(null);
		setCommittedOffset(0);
		if (slidingRef.current) {
			slidingRef.current.style.transition =
				"transform 180ms cubic-bezier(0.25, 0.1, 0.25, 1)";
			slidingRef.current.style.transform = "translateX(0px)";
		}
	}, []);

	const registerSlidingElement = useCallback((el: HTMLDivElement | null) => {
		slidingRef.current = el;
		if (el) {
			el.style.transform = "translateX(0px)";
		}
	}, []);

	return {
		swipedLeft: swipeDirection === "left",
		swipedRight: swipeDirection === "right",
		dragOffset: committedOffset,
		isDragging: startXRef.current !== null,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		close,
		registerSlidingElement,
	};
}
