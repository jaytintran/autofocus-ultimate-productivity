"use client";

import { Moon, Sun, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AboutSection } from "./about-section";

export function Header() {
	const { theme, setTheme } = useTheme();
	const [fontFamily, setFontFamily] = useState<"default" | "rubik">("default");

	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	const toggleFont = () => {
		const newFont = fontFamily === "default" ? "rubik" : "default";
		setFontFamily(newFont);
		document.documentElement.classList.toggle(
			"font-rubik",
			newFont === "rubik",
		);
		localStorage.setItem("font-family", newFont);
	};

	useEffect(() => {
		const savedFont = localStorage.getItem("font-family") as
			| "default"
			| "rubik"
			| null;
		if (savedFont) {
			setFontFamily(savedFont);
			document.documentElement.classList.toggle(
				"font-rubik",
				savedFont === "rubik",
			);
		}
	}, []);

	return (
		<header className="flex items-center justify-between px-6 py-4">
			<div>
				<h1 className="text-sm tracking-[0.3em] font-medium">
					AUT<span className="text-af4-olive">O</span>FOCUS
				</h1>
				<p className="text-[0.625rem] uppercase text-muted-foreground mt-0.5">
					AF4 — One list. One task. Trust the process.
				</p>
			</div>
			<div className="flex items-center gap-2">
				<AboutSection />
				<button
					onClick={toggleFont}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Toggle font"
					title={
						fontFamily === "default"
							? "Switch to Rubik"
							: "Switch to Geist Mono"
					}
				>
					<Type className="w-4 h-4" />
				</button>
				<button
					onClick={toggleTheme}
					className="p-2 hover:bg-accent rounded transition-colors"
					aria-label="Toggle theme"
				>
					{theme === "dark" ? (
						<Sun className="w-4 h-4" />
					) : (
						<Moon className="w-4 h-4" />
					)}
				</button>
			</div>
		</header>
	);
}
