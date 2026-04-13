import { Sunrise, CloudSun, Moon } from "lucide-react";

export function parseAtTime(
	text: string,
): { isoString: string; display: string } | null {
	const now = new Date();

	// @midnight
	if (/@midnight(?=\s|$)/i.test(text)) {
		const result = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0,
			0,
			0,
			0,
		);
		return { isoString: result.toISOString(), display: "00:00" };
	}

	// @midday / @noon
	if (/@(?:midday|noon)(?=\s|$)/i.test(text)) {
		const result = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			12,
			0,
			0,
			0,
		);
		return { isoString: result.toISOString(), display: "12:00" };
	}

	// @now
	if (/@now(?=\s|$)/i.test(text)) {
		const display = now.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		return { isoString: now.toISOString(), display };
	}

	// @<N>ago — e.g. @30mago @2hago @2hrago
	const agoMatch = text.match(/@(\d+)\s*(h|hr|m|min|mins?)ago(?=\s|$)/i);
	if (agoMatch) {
		const amount = parseInt(agoMatch[1], 10);
		const unit = agoMatch[2].toLowerCase();
		const ms =
			unit === "h" || unit === "hr" ? amount * 3600000 : amount * 60000;
		const result = new Date(now.getTime() - ms);
		const display = result.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		return { isoString: result.toISOString(), display };
	}

	// @6am, @6pm, @6am30, @6pm30, @6:30am, @6:30pm, @18:30, @1800
	const match = text.match(
		/@(\d{1,2})(?::(\d{2})|h(\d{2})|(\d{2})(?=am|pm))?\s*(am|pm)?(?=\s|$)/i,
	);
	if (!match) return null;

	let hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2] ?? match[3] ?? match[4] ?? "0", 10);
	const meridiem = (match[5] ?? "").toLowerCase();
	const rawToken = match[0].toLowerCase();
	const hasPm = rawToken.includes("pm") || meridiem === "pm";
	const hasAm = rawToken.includes("am") || meridiem === "am";

	if (hasPm && hours !== 12) hours += 12;
	if (hasAm && hours === 12) hours = 0;
	if (hours > 23 || minutes > 59) return null;

	const result = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		hours,
		minutes,
		0,
		0,
	);
	const display = result.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return { isoString: result.toISOString(), display };
}

export function stripAtTime(text: string): string {
	return text
		.replace(/@midnight(?=\s|$)/gi, "")
		.replace(/@(?:midday|noon)(?=\s|$)/gi, "")
		.replace(/@now(?=\s|$)/gi, "")
		.replace(/@\d+\s*(?:h|hr|m|min|mins?)ago(?=\s|$)/gi, "")
		.replace(
			/@\d{1,2}(?::\d{2}|h\d{2}|\d{2}(?=am|pm))?\s*(?:am|pm)?(?=\s|$)/gi,
			"",
		)
		.replace(/\s{2,}/g, " ")
		.trim();
}

export function formatCompletionTime(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

export function formatDateGroup(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const taskDate = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);

	const diffDays = Math.floor(
		(today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear().toString().slice(-2);
	const numericDate = `${day}/${month}/${year}`;

	if (diffDays === 0) return `Today (${numericDate})`;
	if (diffDays === 1) return `Yesterday (${numericDate})`;

	return numericDate;
}

export function getDateKey(dateString: string): string {
	const date = new Date(dateString);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getTimePeriod(
	dateString: string,
): "morning" | "afternoon" | "evening" {
	const hour = new Date(dateString).getHours();
	if (hour < 12) return "morning";
	if (hour < 18) return "afternoon";
	return "evening";
}

export function getTimePeriodLabel(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "Morning (00:00 - 11:59)";
		case "afternoon":
			return "Afternoon (12:00 - 17:59)";
		case "evening":
			return "Evening (18:00 - 23:59)";
	}
}

export function getTimePeriodIcon(period: "morning" | "afternoon" | "evening") {
	switch (period) {
		case "morning":
			return Sunrise;
		case "afternoon":
			return CloudSun;
		case "evening":
			return Moon;
	}
}

export function getTimePeriodColor(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "bg-secondary/80 text-secondary-foreground border border-border/40";
		case "afternoon":
			return "bg-af4-olive/20 text-foreground border border-border/30";
		case "evening":
			return "bg-accent/10 text-accent-foreground border border-border/20";
	}
}

export function getTimePeriodIconColor(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "text-sky-500";
		case "afternoon":
			return "text-amber-500";
		case "evening":
			return "text-indigo-400";
	}
}

export function getTimePeriodBadgeStyle(
	period: "morning" | "afternoon" | "evening",
): string {
	switch (period) {
		case "morning":
			return "border-sky-500/30 text-sky-500 bg-sky-500/5";
		case "afternoon":
			return "border-amber-500/30 text-amber-500 bg-amber-500/5";
		case "evening":
			return "border-indigo-400/30 text-indigo-400 bg-indigo-400/5";
	}
}
