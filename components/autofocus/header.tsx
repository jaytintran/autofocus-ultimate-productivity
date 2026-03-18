"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function Header() {
	const { theme, setTheme } = useTheme();

	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

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
		</header>
	);
}
