"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Type, Palette, TreePine, Download, Waves, Sunset, Trees, Sparkles, FileText, Snowflake, Flower, Briefcase } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ExportSection } from "@/components/shared/settings/export/export-section";

const THEMES = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "golden-twilight", label: "Golden Twilight", icon: Palette },
	{ value: "mossy-woods", label: "Mossy Woods", icon: TreePine },
	{ value: "ocean-depth", label: "Ocean Depth", icon: Waves },
	{ value: "sunset-ember", label: "Sunset Ember", icon: Sunset },
	{ value: "forest-canopy", label: "Forest Canopy", icon: Trees },
	{ value: "midnight-purple", label: "Midnight Purple", icon: Sparkles },
	{ value: "sepia-vintage", label: "Sepia Vintage", icon: FileText },
	{ value: "arctic-frost", label: "Arctic Frost", icon: Snowflake },
	{ value: "cherry-blossom", label: "Cherry Blossom", icon: Flower },
	{ value: "slate-professional", label: "Slate Professional", icon: Briefcase },
] as const;

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	type FontId =
		| "default"
		| "rubik"
		| "ibm-plex-mono"
		| "literata"
		| "dm-sans"
		| "playfair";
	const FONTS: { id: FontId; label: string; className: string }[] = [
		{ id: "default", label: "Geist Mono", className: "" },
		{ id: "rubik", label: "Rubik", className: "font-rubik" },
		{ id: "ibm-plex-mono", label: "IBM Plex", className: "font-ibm-plex-mono" },
		{ id: "literata", label: "Literata", className: "font-literata" },
		{ id: "dm-sans", label: "DM Sans", className: "font-dm-sans" },
		{ id: "playfair", label: "Playfair", className: "font-playfair" },
	];
	const ALL_FONT_CLASSES = FONTS.map((f) => f.className).filter(Boolean);

	const [fontFamily, setFontFamily] = useState<FontId>("default");

	useEffect(() => {
		setMounted(true);

		// Load theme from localStorage on mount
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme) {
			handleThemeChange(savedTheme);
		}
	}, []);

	useEffect(() => {
		const savedFont = localStorage.getItem("font-family") as FontId | null;
		if (savedFont) {
			setFontFamily(savedFont);
			const cls = FONTS.find((f) => f.id === savedFont)?.className;
			document.documentElement.classList.remove(...ALL_FONT_CLASSES);
			if (cls) document.documentElement.classList.add(cls);
		}
	}, []);

	const selectFont = (id: FontId) => {
		const font = FONTS.find((f) => f.id === id)!;
		setFontFamily(id);
		document.documentElement.classList.remove(...ALL_FONT_CLASSES);
		if (font.className) document.documentElement.classList.add(font.className);
		localStorage.setItem("font-family", id);
	};

	const handleThemeChange = (newTheme: string) => {
		const root = document.documentElement;

		// remove all themes first
		root.classList.remove(
			"dark",
			"golden-twilight",
			"mossy-woods",
			"ocean-depth",
			"sunset-ember",
			"forest-canopy",
			"midnight-purple",
			"sepia-vintage",
			"arctic-frost",
			"cherry-blossom",
			"slate-professional"
		);

		if (newTheme !== "light") {
			root.classList.add(newTheme);
		}

		// sync with next-themes and persist to localStorage
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
	};

	const getCurrentThemeIcon = () => {
		if (!mounted) return Sun;
		const currentTheme = THEMES.find((t) => t.value === theme);
		return currentTheme?.icon || Sun;
	};

	const getCurrentThemeLabel = () => {
		if (!mounted) return "Light";
		const currentTheme = THEMES.find((t) => t.value === theme);
		return currentTheme?.label || "Light";
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-sm tracking-[0.2em] font-medium">
						SETT<span className="text-af4-olive">I</span>NGS
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Theme Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
							{(() => {
								const Icon = getCurrentThemeIcon();
								return <Icon className="w-3 h-3" />;
							})()}
							<span>Theme</span>
						</div>
						<Select value={theme} onValueChange={handleThemeChange}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select a theme" />
							</SelectTrigger>
							<SelectContent>
								{THEMES.map((t) => {
									const Icon = t.icon;
									return (
										<SelectItem key={t.value} value={t.value}>
											<div className="flex items-center gap-2">
												<Icon className="w-4 h-4" />
												<span>{t.label}</span>
											</div>
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
						<p className="text-[0.625rem] text-muted-foreground">
							Current: {getCurrentThemeLabel()}
						</p>
					</div>

					{/* Font Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
							<Type className="w-3 h-3" />
							<span>Typography</span>
						</div>
						<div className="grid grid-cols-3 gap-1">
							{FONTS.map((font) => (
								<button
									key={font.id}
									onClick={() => selectFont(font.id)}
									className={`py-1.5 px-2 text-xs rounded border transition-colors ${
										fontFamily === font.id
											? "bg-af4-olive text-background border-af4-olive"
											: "border-border text-muted-foreground hover:bg-accent"
									}`}
								>
									{font.label}
								</button>
							))}
						</div>
					</div>

					<hr className="border-border" />

					{/* Export */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
							<Download className="w-3 h-3" />
							<span>Export</span>
						</div>
						<ExportSection />
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
