"use client";

import { useState } from "react";
import { Info, X, ChevronRight } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

const TAG_GUIDE = [
	{
		emoji: "🎯",
		label: "Finish",
		color: "amber",
		description:
			'Outcome-driven work with a clear completion state. You know exactly what "done" looks like before you start. These re-enter perfectly because the intent survives every cycle.',
		examples: [
			"Finish the book Psycho-Cybernetics",
			"Finish the homepage of the portfolio",
			"Finish Module 3 of the negotiation course",
			"Finish the Q3 section of the quarterly report",
			"Finish the first draft of the investor proposal",
		],
		note: null,
		reentry: "Medium",
		reentryReason: "Deliverable was too large. Break into smaller pieces.",
	},
	{
		emoji: "🧭",
		label: "Explore",
		color: "teal",
		description:
			"Intentionally open-ended work where the output is clarity, not a deliverable. You go in not knowing what you'll find. The task is to emerge with something more concrete — which then becomes the next 🎯 Finish task.",
		examples: [
			"Explore ideas for the new app feature",
			"Research standing desk options",
			"Work on the content strategy direction",
			"Look into visa requirements for Japan",
			"Browse reference designs for the landing page",
		],
		note: "These don't have a fixed end state — and that's intentional. Once you've explored, you'll know what to Finish next.",
		reentry: "High",
		reentryReason:
			"Expected. Each re-entry should produce new clarity or new Finish tasks.",
	},
	{
		emoji: "⚡",
		label: "Quick",
		color: "blue",
		description:
			"Single-shot tasks that take one sitting, have no re-entry scenario, and don't need to survive multiple cycles. Low friction, high throughput. If it takes under 15 minutes and you'll never need to re-enter it, it's a Quick.",
		examples: [
			"Read the Stratechery piece on Apple",
			"Reply to Marco's email about the meeting",
			"Pay the electricity bill",
			"Watch the 8-minute video on cold outreach",
			"Book the airport transfer for Friday",
		],
		note: null,
		reentry: "Low",
		reentryReason: "If a Quick re-enters, reclassify as Handle or Finish.",
	},
	{
		emoji: "🔧",
		label: "Handle",
		color: "coral",
		description:
			"Still one-shot but with more administrative weight. 'Wash the dishes' is Quick. 'Renew the car insurance' looks quick but often has steps, waiting, and follow-up — that's Handle territory. Re-enters because of waiting periods and external dependencies.",
		examples: [
			"Handle passport renewal",
			"Handle the car insurance renewal",
			"Handle the broken kitchen drawer",
			"Handle the Supabase billing issue",
			"Handle the visa application documents",
		],
		note: "If you find yourself thinking 'this should be quick but keeps not getting done' — it's probably a Handle, not a Quick.",
		reentry: "Medium",
		reentryReason:
			"External dependencies and waiting periods. Re-entry is part of the process until resolution.",
	},
];

const TABS = [
	{ id: "philosophy", label: "Philosophy" },
	{ id: "how", label: "How It Works" },
	{ id: "steps", label: "The Steps" },
	{ id: "dismissal", label: "No Dismissal" },
	{ id: "writing", label: "Writing Tasks" },
	{ id: "tagging", label: "How to Tag" },
	{ id: "features", label: "Features" },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 mt-6 first:mt-0">
			{children}
		</h4>
	);
}

function Prose({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-[13.5px] leading-relaxed text-foreground/75 mb-3">
			{children}
		</p>
	);
}

function Callout({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-l-2 border-foreground/15 pl-4 my-4 text-[13px] leading-relaxed text-foreground/60 italic">
			{children}
		</div>
	);
}

function ExamplePill({ text }: { text: string }) {
	return (
		<span className="inline-flex items-center text-[12px] text-foreground/60 bg-accent/50 rounded px-2 py-0.5 mr-1.5 mb-1.5 font-mono">
			{text}
		</span>
	);
}

function TagCard({ tag }: { tag: (typeof TAG_GUIDE)[0] }) {
	const reentryColor =
		tag.reentry === "High"
			? "text-emerald-600 dark:text-emerald-400"
			: tag.reentry === "Medium"
				? "text-amber-600 dark:text-amber-400"
				: "text-red-500 dark:text-red-400";

	return (
		<div className="border border-border/50 rounded-xl p-4 space-y-3 hover:border-border transition-colors">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-lg">{tag.emoji}</span>
					<span className="font-semibold text-[14px] text-foreground">
						{tag.label}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] text-muted-foreground/60">re-entry</span>
					<span className={`text-[11px] font-semibold ${reentryColor}`}>
						{tag.reentry}
					</span>
				</div>
			</div>

			<p className="text-[13px] leading-relaxed text-foreground/70">
				{tag.description}
			</p>

			<div className="flex flex-wrap pt-1">
				{tag.examples.map((ex) => (
					<ExamplePill key={ex} text={ex} />
				))}
			</div>

			{tag.note && (
				<p className="text-[12px] text-foreground/55 border-t border-border/40 pt-3 mt-1">
					{tag.note}
				</p>
			)}
		</div>
	);
}

function PhilosophyTab() {
	return (
		<div className="space-y-0">
			<Prose>
				Most productivity systems fail because they rely entirely on your
				rational mind to decide what to do next. You make a prioritized list,
				you follow it top to bottom, and ignore the fact that your brain doesn't
				actually work that way. The result is resistance, procrastination, and a
				nagging sense that you're working on the wrong things.
			</Prose>
			<Prose>
				Autofocus works by balancing two parts of your mind — the rational and
				the intuitive. Your rational mind captures everything (the list). Your
				intuitive mind decides what's ready to be done (the "standing out"
				feeling). Neither part runs the show alone.
			</Prose>
			<Prose>
				The result: less friction, less stress, more output, and a focus that
				feels genuinely aligned with what matters — not just what looks urgent
				on paper.
			</Prose>

			<SectionHeading>Key principles</SectionHeading>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{[
					[
						"Trust your intuition",
						"Don't force priorities; let tasks naturally rise",
					],
					["No pressure", "Work on what feels right, not what seems urgent"],
					["Keep moving", "If nothing stands out, move to the next page"],
					["Re-enter freely", "Incomplete tasks get another chance at the end"],
				].map(([title, desc]) => (
					<div
						key={title}
						className="flex gap-3 p-3 rounded-lg bg-accent/40 border border-border/30"
					>
						<ChevronRight className="w-3.5 h-3.5 text-foreground/30 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-[13px] font-medium text-foreground">{title}</p>
							<p className="text-[12px] text-foreground/60 mt-0.5">{desc}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function HowTab() {
	return (
		<div>
			<Prose>
				Add tasks to the list as they come to mind — no sorting, no ranking. New
				tasks always go at the end.
			</Prose>
			<Prose>
				Work through the list page by page. On each page, read through the tasks
				and wait for one to stand out — to feel ready, interesting, or simply
				right. That's the one you work on. Click it, start the timer, and go.
			</Prose>
			<Prose>
				When you're done with a task (or ready to move on), mark it complete,
				re-enter it at the end of the list, or delete it. Then look at the page
				again and see what stands out next. Repeat until nothing is calling to
				you, then move to the next page.
			</Prose>
			<Callout>
				If a task keeps being skipped, that's information — either break it down
				into something smaller, or delete it honestly.
			</Callout>
		</div>
	);
}

function StepsTab() {
	return (
		<div>
			<SectionHeading>The steps</SectionHeading>
			<ol className="space-y-3 mb-8">
				{[
					"Write down everything you need to do in one long list — no sorting, no ranking, no priorities. New tasks always go at the end.",
					"Work through the list page by page, starting from page 1.",
					"On each page, read through all the tasks first without acting. Then go slowly and ask: what do I want to do?",
					"When a task stands out — feels ready, interesting, or simply right — work on it for as long as feels natural.",
					"When you stop: if done, mark it complete. If not, re-enter it at the end of the list and mark the original complete.",
					"Continue scanning the same page from where you left off.",
					"When you reach the end of the page with nothing standing out, move to the next page.",
					"After finishing the last page, return to the first page that still has active tasks.",
				].map((step, i) => (
					<li key={i} className="flex gap-4">
						<span className="w-6 h-6 rounded-full border border-border/60 text-[11px] font-semibold text-foreground/40 flex items-center justify-center flex-shrink-0 mt-0.5">
							{i + 1}
						</span>
						<p className="text-[13.5px] leading-relaxed text-foreground/75">
							{step}
						</p>
					</li>
				))}
			</ol>

			<SectionHeading>Where the system truly shines</SectionHeading>
			<Prose>
				AF4 reveals its real power with long-form tasks — the kind that take
				days, weeks, or months to finish. Consider{" "}
				<em>Finish the book Psycho-Cybernetics</em>. You work on it today, get
				through two chapters, stop naturally. You mark it complete and re-enter
				it at the end of the list. Tomorrow it comes back around.
			</Prose>
			<Prose>
				What's left behind in your Completed Tasks view is a trail: every
				session you spent on that book, each one a completed task. The system
				doesn't just track that you finished the book — it shows you the work
				that went into it.
			</Prose>

			<SectionHeading>What "standing out" actually means</SectionHeading>
			<Prose>
				Standing out isn't a dramatic feeling. It's subtle — a slight pull, a
				readiness, a sense that now is the right time for this particular thing.
				It might be curiosity, momentum from earlier work, or simply that the
				task feels less heavy than the others.
			</Prose>
			<Callout>
				If you're scanning and nothing stands out, that's valid information too.
				Don't force it. Move to the next page.
			</Callout>

			<SectionHeading>A practical note</SectionHeading>
			<Prose>
				If a task keeps getting re-entered and never seems to stand out, pay
				attention. It might be too vague — break it into a more concrete "Finish
				X." Or it might no longer matter. Either way, the system is surfacing
				something worth noticing.
			</Prose>
		</div>
	);
}

function DismissalTab() {
	return (
		<div>
			<Prose>
				The original Autofocus system included a "dismissal" mechanic: if you
				cycled through an entire page without any task standing out, all
				remaining tasks on that page were permanently retired — greyed out, not
				re-entered, gone.
			</Prose>
			<Prose>
				This mechanic made sense for its original medium: a paper notebook. On
				paper, you can't delete a task. Dismissal was the only way to formally
				retire something that had stopped being relevant. It was the system's
				self-cleaning mechanism.
			</Prose>
			<Callout>This app has a delete button.</Callout>
			<Prose>
				Beyond that, dismissal added cognitive overhead — you had to track
				whether you'd completed a "full pass," remember not to advance pages too
				early, and manage a third visual state (active, completed, dismissed).
				In a digital environment where deletion is instant and reversible, that
				complexity serves no purpose.
			</Prose>
			<Prose>
				This approach puts the decision consciously in your hands rather than
				delegating it to a page-cycling rule. It's more direct, and for how most
				people actually use a digital task list, it's more honest.
			</Prose>
		</div>
	);
}

function WritingTab() {
	return (
		<div>
			<Prose>
				How you write a task changes how your brain responds to it. The same
				piece of work written two different ways produces two different levels
				of resistance — and two different completion rates.
			</Prose>
			<Prose>
				The core principle: describe the{" "}
				<strong className="text-foreground">outcome</strong>, not the activity.
				Your brain responds to clear end states. A task that tells you what the
				world looks like when it's done is easier to start, easier to finish,
				and easier to re-enter when it's incomplete.
			</Prose>

			<SectionHeading>The formula</SectionHeading>
			<div className="font-mono text-[12px] text-foreground/70 bg-accent/50 rounded-lg px-4 py-3 mb-6 border border-border/30">
				Finish + [specific deliverable] + [enough context to be unambiguous]
			</div>

			<div className="space-y-2 mb-8">
				{[
					[
						"Read the book Psycho-Cybernetics",
						"Finish the book Psycho-Cybernetics",
					],
					[
						"Watch the negotiation course",
						"Finish Module 2 of the negotiation course",
					],
					[
						"Work on the portfolio website",
						"Finish the homepage of the portfolio",
					],
					[
						"Do the quarterly report",
						"Finish the Q3 section of the quarterly report",
					],
				].map(([before, after]) => (
					<div
						key={before}
						className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-2.5 border-b border-border/30 last:border-0"
					>
						<span className="text-[12.5px] line-through text-foreground/35">
							{before}
						</span>
						<span className="text-foreground/20 text-[11px]">→</span>
						<span className="text-[12.5px] font-medium text-foreground/80">
							{after}
						</span>
					</div>
				))}
			</div>

			<SectionHeading>When open-ended framing is right</SectionHeading>
			<Prose>Two situations where "Finish" is the wrong frame:</Prose>
			<div className="space-y-3 mb-6">
				{[
					{
						title: "Exploratory work",
						desc: "When the output of doing the task is the discovery of what to do next. Use open-ended framing as a bridge, not a permanent home.",
					},
					{
						title: "Experience-driven tasks",
						desc: "Travel, exploration, serendipity. Over-specifying kills the experience you were trying to have. Here the outcome is the openness.",
					},
				].map(({ title, desc }) => (
					<div
						key={title}
						className="flex gap-3 p-3.5 rounded-lg border border-border/40"
					>
						<div>
							<p className="text-[13px] font-medium text-foreground mb-1">
								{title}
							</p>
							<p className="text-[12.5px] text-foreground/65 leading-relaxed">
								{desc}
							</p>
						</div>
					</div>
				))}
			</div>

			<SectionHeading>When a task keeps re-entering</SectionHeading>
			<Callout>
				That's a signal, not a failure. Either the task is too vague — break it
				into a smaller, more concrete "Finish" — or it no longer matters. Delete
				it honestly.
			</Callout>
		</div>
	);
}

function TaggingTab() {
	return (
		<div>
			<Prose>
				Tags aren't just labels — they tell you how to <em>approach</em> a task
				before you even start it.
			</Prose>

			<div className="grid grid-cols-2 gap-2 mb-8">
				{[
					{ emoji: "🎯", q: "What does done look like?" },
					{ emoji: "🧭", q: "What will I learn?" },
					{ emoji: "⚡", q: "Can I knock this out now?" },
					{ emoji: "🔧", q: "Looks quick but has steps?" },
				].map(({ emoji, q }) => (
					<div
						key={emoji}
						className="rounded-xl border border-border/40 bg-accent/30 px-3 py-3 text-center"
					>
						<div className="text-xl mb-1.5">{emoji}</div>
						<p className="text-[11.5px] text-foreground/60 leading-snug">{q}</p>
					</div>
				))}
			</div>

			<SectionHeading>Tag definitions</SectionHeading>
			<div className="space-y-3 mb-8">
				{TAG_GUIDE.map((tag) => (
					<TagCard key={tag.label} tag={tag} />
				))}
			</div>

			<SectionHeading>How tags flow in practice</SectionHeading>
			<Prose>A task often moves through types as it matures:</Prose>
			<div className="rounded-xl border border-border/40 bg-accent/30 px-4 py-4 font-mono text-[12px] space-y-1.5 mb-6">
				<p className="text-foreground/80">
					🧭 Explore content strategy direction
				</p>
				<p className="text-foreground/35 pl-4 text-[11px]">
					↓ you emerge with clarity
				</p>
				<p className="text-foreground/80">
					🎯 Finish the three-pillar content framework doc
				</p>
				<p className="text-foreground/35 pl-4 text-[11px]">
					↓ along the way you need to
				</p>
				<p className="text-foreground/80">
					⚡ Read the Wes Kao newsletter on positioning
				</p>
			</div>

			<SectionHeading>No tag?</SectionHeading>
			<Prose>
				That's fine too. Untagged tasks are honest — it means you haven't
				decided how to approach it yet. Use the{" "}
				<strong className="text-foreground">No 🏷️</strong> filter to surface
				them and tag in bulk when you're ready.
			</Prose>
		</div>
	);
}

function FeaturesTab() {
	const sections = [
		{
			title: "Schedule View (Time Blocking)",
			items: [
				[
					"Time blocks as containers",
					"Create blocks for different parts of your day. Each block is a time-bounded container, not a task itself.",
				],
				[
					"Drag-and-drop scheduling",
					"Drag tasks from the unscheduled list onto time blocks, or tap the clock icon on mobile.",
				],
				[
					"Visual timeline",
					"See your entire day from 6 AM to midnight with half-hour grid lines and a live current-time indicator.",
				],
				[
					"Overlapping blocks",
					"Blocks can overlap (e.g., 'Exercise' and 'Podcast' simultaneously). Layout arranges them side-by-side.",
				],
				[
					"Mobile-optimized",
					"Three-tab layout (Timeline, Unscheduled, Block Detail) with tap-to-schedule flow for touch devices.",
				],
			],
			note: 'A time block is not a task — it\'s a labeled container for a period of time. "Deep Work 9-11 AM" is the block. "Finish Chapter 3" is the task inside it.',
		},
		{
			title: "Task Management",
			items: [
				[
					"Page-based navigation",
					"12 tasks per page, work through one page at a time.",
				],
				[
					"Working task panel",
					"Live timer with start/pause/resume/stop controls.",
				],
				[
					"Task tags",
					"🎯 Finish, 🧭 Explore, ⚡ Quick, 🔧 Handle with filter bar.",
				],
				[
					"Completed tasks view",
					"Three display modes: grouped by date, bullet journal, or 7-day grid.",
				],
				["Export", "JSON, CSV, or Markdown."],
			],
			note: null,
		},
		{
			title: "Habit Tracking",
			items: [
				["Daily check-ins", "Mark habits complete with streak tracking."],
				["Frequency targets", "Set weekly goals (e.g., 3×/week, 5×/week)."],
				["66-day habit formation", "Track progress toward habit automation."],
			],
			note: null,
		},
		{
			title: "Project Management",
			items: [
				[
					"Project dashboard",
					"Status tracking: Planning, Active, On Hold, Completed, Archived.",
				],
				["Progress tracking", "Percentage completion with visual indicators."],
				["Key outcomes", "Define and monitor project deliverables."],
			],
			note: null,
		},
		{
			title: "Book Tracking",
			items: [
				["Reading list", "Organized by domain across 9 categories."],
				["Reading progress", "Track page numbers and completion percentages."],
				["Status management", "To Read, Reading, Completed, Paused, DNF."],
				["Notes and takeaways", "Capture key insights and reflections."],
			],
			note: null,
		},
		{
			title: "Theming & Data",
			items: [
				["Themes", "Light, Dark, Golden Twilight, Mossy Woods."],
				[
					"Custom fonts",
					"Geist Mono, Rubik, IBM Plex Mono, Literata, DM Sans, Playfair Display.",
				],
				[
					"Supabase backend",
					"Real-time sync across all devices with row-level security.",
				],
			],
			note: null,
		},
	];

	return (
		<div className="space-y-8">
			{sections.map(({ title, items, note }) => (
				<div key={title}>
					<SectionHeading>{title}</SectionHeading>
					<div className="space-y-2">
						{items.map(([label, desc]) => (
							<div key={label} className="flex gap-3 items-start">
								<span className="w-1.5 h-1.5 rounded-full bg-foreground/20 mt-2 flex-shrink-0" />
								<div>
									<span className="text-[13px] font-medium text-foreground">
										{label}
									</span>
									<span className="text-[13px] text-foreground/60">
										{" "}
										— {desc}
									</span>
								</div>
							</div>
						))}
					</div>
					{note && (
						<div className="mt-3 text-[12px] text-foreground/55 bg-accent/40 border border-border/30 rounded-lg px-3.5 py-2.5">
							<strong className="text-foreground/70">Key insight:</strong>{" "}
							{note}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

const TAB_CONTENT: Record<string, React.ReactNode> = {
	philosophy: <PhilosophyTab />,
	how: <HowTab />,
	steps: <StepsTab />,
	dismissal: <DismissalTab />,
	writing: <WritingTab />,
	tagging: <TaggingTab />,
	features: <FeaturesTab />,
};

export function AboutSection() {
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("philosophy");

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="p-2 hover:bg-accent rounded-lg transition-colors text-foreground/80"
				aria-label="About Autofocus"
				title="About Autofocus (AF4)"
			>
				<Info className="w-4 h-4" />
			</button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[780px] h-[82vh] flex flex-col overflow-hidden p-0 gap-0">
					{/* Header */}
					<div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50 flex-shrink-0">
						<div>
							<DialogTitle className="text-[15px] font-semibold tracking-tight">
								Autofocus AF4
							</DialogTitle>
							<DialogDescription className="text-[12px] text-muted-foreground/70 mt-0.5">
								System guide & documentation
							</DialogDescription>
						</div>
					</div>

					<div className="flex flex-1 min-h-0 overflow-hidden">
						{/* Sidebar nav */}
						<nav className="w-40 flex-shrink-0 border-r border-border/50 py-3 px-2 space-y-0.5 overflow-y-auto hidden sm:block">
							{TABS.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`w-full text-left px-3 py-2 rounded-lg text-[12.5px] transition-colors ${
										activeTab === tab.id
											? "bg-accent text-foreground font-medium"
											: "text-foreground/55 hover:text-foreground/80 hover:bg-accent/50"
									}`}
								>
									{tab.label}
								</button>
							))}
						</nav>

						{/* Mobile tab strip */}
						<div className="absolute top-[72px] left-0 right-0 sm:hidden flex overflow-x-auto gap-1 px-4 py-2 border-b border-border/50 bg-background z-10 scrollbar-none">
							{TABS.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] transition-colors ${
										activeTab === tab.id
											? "bg-foreground text-background font-medium"
											: "text-foreground/55 hover:bg-accent"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>

						{/* Content area */}
						<div className="flex-1 overflow-y-auto px-6 py-5 sm:py-5 mt-10 sm:mt-0">
							{TAB_CONTENT[activeTab]}

							{/* Footer */}
							<div className="mt-8 pt-4 border-t border-border/30">
								<p className="text-[12px] text-foreground/40">
									Based on{" "}
									<a
										href="http://markforster.squarespace.com/autofocus-system/"
										target="_blank"
										rel="noopener noreferrer"
										className="underline underline-offset-2 hover:text-foreground/60 transition-colors"
									>
										Mark Forster's Autofocus system
									</a>
								</p>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
