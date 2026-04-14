import {
	Brain,
	Code2,
	DollarSign,
	Heart,
	Globe,
	Lightbulb,
	BarChart2,
	Pen,
	Microscope,
	Dumbbell,
	Music,
	Cpu,
	BookOpen as BookOpenIcon,
	Flame,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, React.ElementType> = {
	psychology: Brain,
	philosophical: Lightbulb,
	programming: Code2,
	code: Code2,
	software: Code2,
	wealth: DollarSign,
	money: DollarSign,
	investing: BarChart2,
	trading: BarChart2,
	health: Heart,
	fitness: Dumbbell,
	science: Microscope,
	writing: Pen,
	music: Music,
	tech: Cpu,
	technology: Cpu,
	global: Globe,
	power: Globe,
	mental: Brain,
	reality: Flame,
};

export function getDomainIcon(domain: string): React.ElementType {
	const lower = domain.toLowerCase();
	for (const [key, Icon] of Object.entries(DOMAIN_ICONS)) {
		if (lower.includes(key)) return Icon;
	}
	return BookOpenIcon;
}
