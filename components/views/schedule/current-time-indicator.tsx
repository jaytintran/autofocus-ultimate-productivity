import { useState, useEffect } from "react";
import { PIXELS_PER_MINUTE } from "./constants";

export function CurrentTimeIndicator() {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(id);
	}, []);

	const minutes = now.getHours() * 60 + now.getMinutes();
	const top = minutes * PIXELS_PER_MINUTE;

	return (
		<div
			className="absolute left-0 right-0 z-10 pointer-events-none"
			style={{ top }}
		>
			<div className="relative flex items-center">
				<div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
				<div className="flex-1 border-t border-red-500" />
			</div>
		</div>
	);
}
