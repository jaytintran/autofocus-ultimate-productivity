import {
	Cpu,
	Briefcase,
	BarChart2,
	Rocket,
	Zap,
	Dumbbell,
	Flame,
	Globe,
	Pen,
	ShoppingBag,
	DollarSign,
	Users,
	FolderOpen,
	type LucideIcon,
} from "lucide-react";
import type { CourseStatus } from "@/lib/db/courses";

export const CATEGORY_ORDER = [
	"software & ai engineering",
	"agency & freelance",
	"day trading",
	"solopreneur & saas",
	"ace of all trades",
	"combatbuilding & superhuman",
	"supermale & alpha",
	"polyglot vagabond",
	"personal brand",
	"e-commerce",
	"business & investment",
	"society & influence",
];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
	"software & ai engineering": Cpu,
	"agency & freelance": Briefcase,
	"day trading": BarChart2,
	"solopreneur & saas": Rocket,
	"ace of all trades": Zap,
	"combatbuilding & superhuman": Dumbbell,
	"supermale & alpha": Flame,
	"polyglot vagabond": Globe,
	"personal brand": Pen,
	"e-commerce": ShoppingBag,
	"business & investment": DollarSign,
	"society & influence": Users,
};

export const DEFAULT_CATEGORY_ICON = FolderOpen;

export const STATUS_CONFIG: {
	[K in CourseStatus]: {
		label: string;
		dot: string;
		text: string;
		bg: string;
	};
} = {
	not_started: {
		label: "Not Started",
		dot: "bg-muted-foreground/40",
		text: "text-muted-foreground",
		bg: "bg-muted/50",
	},
	in_progress: {
		label: "In Progress",
		dot: "bg-sky-500",
		text: "text-sky-500",
		bg: "bg-sky-500/10",
	},
	paused: {
		label: "Paused",
		dot: "bg-amber-400",
		text: "text-amber-500",
		bg: "bg-amber-500/10",
	},
	completed: {
		label: "Completed",
		dot: "bg-[#8b9a6b]",
		text: "text-[#8b9a6b]",
		bg: "bg-[#8b9a6b]/10",
	},
	dropped: {
		label: "Dropped",
		dot: "bg-muted-foreground/20",
		text: "text-muted-foreground/40",
		bg: "bg-muted/30",
	},
};

export const PRIORITY_CONFIG: {
	[key: string]: { label: string; color: string; bg: string; order: number };
} = {
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
	LOW: {
		label: "LOW",
		color: "text-muted-foreground",
		bg: "bg-muted",
		order: 3,
	},
};
