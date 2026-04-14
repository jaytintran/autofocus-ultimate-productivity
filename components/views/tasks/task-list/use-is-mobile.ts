import { useState, useEffect } from "react";

/** Detect mobile viewport for conditional swipe/behavior */
export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 768);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);
	return isMobile;
}
