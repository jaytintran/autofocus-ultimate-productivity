import type { BookStatus } from "@/lib/db/books";

export const STATUS_CONFIG: Record<
	BookStatus,
	{ label: string; dot: string; text: string; bg: string }
> = {
	unread: {
		label: "Not Started",
		dot: "bg-muted-foreground/30",
		text: "text-muted-foreground",
		bg: "bg-muted/50",
	},
	reading: {
		label: "Reading",
		dot: "bg-sky-500",
		text: "text-sky-500",
		bg: "bg-sky-500/10",
	},
	completed: {
		label: "Completed",
		dot: "bg-[#8b9a6b]",
		text: "text-[#8b9a6b]",
		bg: "bg-[#8b9a6b]/10",
	},
	abandoned: {
		label: "Abandoned",
		dot: "bg-muted-foreground/20",
		text: "text-muted-foreground/40",
		bg: "bg-muted/30",
	},
};

export const PRIORITY_CONFIG: Record<
	string,
	{ label: string; color: string; bg: string; order: number }
> = {
	CRITICAL: {
		label: "CRITICAL",
		color: "text-red-500",
		bg: "bg-red-500/10",
		order: 0,
	},
	HIGH: {
		label: "HIGH",
		color: "text-orange-500",
		bg: "bg-orange-500/10",
		order: 1,
	},
	MEDIUM: {
		label: "MEDIUM",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		order: 2,
	},
	SUPPLEMENTAL: {
		label: "SUPP",
		color: "text-blue-400",
		bg: "bg-blue-400/10",
		order: 3,
	},
	LOW: {
		label: "LOW",
		color: "text-muted-foreground",
		bg: "bg-muted",
		order: 4,
	},
};
