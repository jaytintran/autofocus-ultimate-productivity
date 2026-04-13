import {
	Target,
	FolderOpen,
	TrendingUp,
	Laptop2,
	BicepsFlexed,
	Glasses,
	Globe2,
	Flame,
	ShoppingBasket,
	DollarSign,
	Users,
	type LucideIcon,
} from "lucide-react";
import type { HabitStatus } from "@/lib/db/habits";

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
	"software & ai engineering": Target,
	"agency & freelance": FolderOpen,
	"day trading": TrendingUp,
	"solopreneur & saas": Laptop2,
	"ace of all trades": Target,
	"combatbuilding & superhuman": BicepsFlexed,
	"supermale & alpha": Glasses,
	"polyglot vagabond": Globe2,
	"personal brand": Flame,
	"e-commerce": ShoppingBasket,
	"business & investment": DollarSign,
	"society & influence": Users,
};

export const STATUS_CONFIG: {
	[K in HabitStatus]: {
		label: string;
		dot: string;
		text: string;
		bg: string;
	};
} = {
	active: {
		label: "Active",
		dot: "bg-sky-500",
		text: "text-sky-500",
		bg: "bg-sky-500/10",
	},
	paused: {
		label: "Paused",
		dot: "bg-muted-foreground/40",
		text: "text-muted-foreground",
		bg: "bg-muted/50",
	},
	archived: {
		label: "Archived",
		dot: "bg-muted-foreground/20",
		text: "text-muted-foreground/40",
		bg: "bg-muted/30",
	},
};

export const HABIT_COLORS = [
	{ name: "Olive", value: "#8b9a6b" },
	{ name: "Sky", value: "#0ea5e9" },
	{ name: "Amber", value: "#f59e0b" },
	{ name: "Rose", value: "#f43f5e" },
	{ name: "Violet", value: "#8b5cf6" },
	{ name: "Emerald", value: "#10b981" },
];
