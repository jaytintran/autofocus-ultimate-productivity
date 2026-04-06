"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportTasks, exportSuite, type ExportFormat } from "@/lib/export";

export function ExportSection() {
	const [format, setFormat] = useState<ExportFormat>("json");
	const [loadingTasks, setLoadingTasks] = useState(false);
	const [loadingSuite, setLoadingSuite] = useState(false);

	async function handleExportTasks() {
		setLoadingTasks(true);
		try {
			await exportTasks(format);
		} catch (e) {
			console.error("Export failed", e);
		} finally {
			setLoadingTasks(false);
		}
	}

	async function handleExportSuite() {
		setLoadingSuite(true);
		try {
			await exportSuite(format);
		} catch (e) {
			console.error("Export failed", e);
		} finally {
			setLoadingSuite(false);
		}
	}

	const formats: { value: ExportFormat; label: string }[] = [
		{ value: "json", label: "JSON" },
		{ value: "csv", label: "CSV" },
		{ value: "markdown", label: "Markdown" },
	];

	return (
		<div className="space-y-4">
			{/* Format selector */}
			<div>
				<p className="text-[0.625rem] uppercase text-muted-foreground tracking-widest mb-2">
					Format
				</p>
				<div className="flex gap-1">
					{formats.map((f) => (
						<button
							key={f.value}
							onClick={() => setFormat(f.value)}
							className={`flex-1 py-1.5 text-xs rounded transition-colors border ${
								format === f.value
									? "bg-af4-olive text-background border-af4-olive"
									: "border-border text-muted-foreground hover:bg-accent"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Export buttons */}
			<div className="flex gap-2">
				<button
					onClick={handleExportTasks}
					disabled={loadingTasks}
					className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-border rounded hover:bg-accent transition-colors disabled:opacity-50"
				>
					{loadingTasks ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<Download className="w-3 h-3" />
					)}
					Tasks
				</button>

				<button
					onClick={handleExportSuite}
					disabled={loadingSuite}
					className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-border rounded hover:bg-accent transition-colors disabled:opacity-50"
				>
					{loadingSuite ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<Download className="w-3 h-3" />
					)}
					Suite
				</button>
			</div>

			{/* Hint */}
			<p className="text-[0.6rem] text-muted-foreground leading-relaxed">
				<span className="font-medium text-foreground">Tasks</span> — active +
				completed with notes.{" "}
				<span className="font-medium text-foreground">Suite</span> — habits,
				projects &amp; books.
				{format === "csv" && " CSV suite triggers 3 separate downloads."}
			</p>
		</div>
	);
}
