"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

const TAG_GUIDE = [
	{
		emoji: "🎯",
		label: "Finish",
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
	},
	{
		emoji: "🧭",
		label: "Explore",
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
	},
	{
		emoji: "⚡",
		label: "Quick",
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
	},
	{
		emoji: "🔧",
		label: "Handle",
		description:
			"Quick is frictionless and immediate, Handle is still one-shot but has more administrative weight to it. 'Wash the dishes' is Quick. 'Renew the car insurance' looks quick but often has steps, waiting, and follow-up — that's Handle territory. Re-enters because of waiting periods and external dependencies — the insurance form needs a document you don't have yet, the repair needs a part to arrive. Unlike Quick, this is expected. Unlike Finish, there's no creative output — just resolution. Keep re-entering until it closes.",
		examples: [
			"Handle passport renewal",
			"Handle the car insurance renewal",
			"Handle the broken kitchen drawer",
			"Handle the Supabase billing issue",
			"Handle the visa application documents",
		],
		note: "If you find yourself thinking 'this should be quick but keeps not getting done' — it's probably a Handle, not a Quick.",
	},
];

export function AboutSection() {
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("philosophy");
	const isMobile = useIsMobile();

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className="p-2 hover:bg-accent rounded transition-colors"
				aria-label="About Autofocus"
				title="About Autofocus (AF4)"
			>
				<Info className="w-4 h-4" />
			</button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[760px] h-[75vh] flex flex-col overflow-hidden">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>About Autofocus (AF4)</DialogTitle>
						<DialogDescription>
							Learn about the Autofocus productivity system and how to use it
							effectively.
						</DialogDescription>
					</DialogHeader>

					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="flex flex-col min-h-0 pt-4"
					>
						<Select value={activeTab} onValueChange={setActiveTab}>
							<SelectTrigger className="w-full mb-4 flex-shrink-0">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="philosophy">The Philosophy</SelectItem>
								<SelectItem value="how">How It Works</SelectItem>
								<SelectItem value="steps">The Steps</SelectItem>
								<SelectItem value="dismissal">Why No Dismissal</SelectItem>
								<SelectItem value="writing">Writing Tasks</SelectItem>
								<SelectItem value="tagging">How to Tag</SelectItem>
							</SelectContent>
						</Select>

						{/* <TabsList className="w-full grid grid-cols-5 flex-shrink-0">
							// 	<TabsTrigger value="philosophy" className="flex-1">
							// 		The Philosophy
							// 	</TabsTrigger>
							// 	<TabsTrigger value="how" className="flex-1">
							// 		How It Works
							// 	</TabsTrigger>
							// 	<TabsTrigger value="steps" className="flex-1">
							// 		The Steps
							// 	</TabsTrigger>
							// 	<TabsTrigger value="dismissal" className="flex-1">
							// 		Why No Dismissal
							// 	</TabsTrigger>
							// 	<TabsTrigger value="writing" className="flex-1">
							// 		Writing Tasks
							// 	</TabsTrigger>
							</TabsList> */}

						<div
							className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1"
							style={{
								scrollbarWidth: "thin",
							}}
						>
							<TabsContent
								value="philosophy"
								className="text-sm text-muted-foreground space-y-4 mt-4"
							>
								<p>
									Most productivity systems fail because they rely entirely on
									your rational mind to decide what to do next. You make a
									prioritized list, you follow it top to bottom, and you ignore
									the fact that your brain doesn't actually work that way. The
									result is resistance, procrastination, and a nagging sense
									that you're working on the wrong things.
								</p>
								<p>
									Autofocus is different. It works by balancing two parts of
									your mind — the rational and the intuitive. Your rational mind
									captures everything (the list). Your intuitive mind decides
									what's ready to be done (the "standing out" feeling). Neither
									part runs the show alone. Together, they produce decisions
									that feel right and actually get executed.
								</p>
								<p>
									The result: less friction, less stress, more output, and a
									focus that feels genuinely aligned with what matters — not
									just what looks urgent on paper.
								</p>
								<div>
									<h4 className="text-foreground font-medium mb-2">
										Key principles:
									</h4>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>
											<strong>Trust your intuition</strong> — Don&apos;t force
											priorities; let tasks naturally rise
										</li>
										<li>
											<strong>No pressure</strong> — Work on what feels right,
											not what seems urgent
										</li>
										<li>
											<strong>Keep moving</strong> — If nothing stands out, move
											to the next page
										</li>
										<li>
											<strong>Re-enter freely</strong> — Incomplete tasks get
											another chance at the end
										</li>
									</ul>
								</div>
							</TabsContent>
							<TabsContent
								value="how"
								className="text-sm text-muted-foreground space-y-4 mt-4"
							>
								<p>
									Add tasks to the list as they come to mind — no sorting, no
									ranking. New tasks always go at the end.
								</p>
								<p>
									Work through the list page by page. On each page, read through
									the tasks and wait for one to stand out — to feel ready,
									interesting, or simply right. That's the one you work on.
									Click it, start the timer, and go.
								</p>
								<p>
									When you're done with a task (or ready to move on), mark it
									complete, re-enter it at the end of the list, or delete it.
									Then look at the page again and see what stands out next.
									Repeat until nothing is calling to you, then move to the next
									page.
								</p>
								<p>
									Trust the process. If a task keeps being skipped, that's
									information — either break it down into something smaller, or
									delete it honestly.
								</p>
							</TabsContent>
							<TabsContent
								value="steps"
								className="text-sm text-muted-foreground space-y-6 mt-4"
							>
								{/* The steps */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">The Steps</h4>
									<ol className="space-y-2 ml-1">
										{[
											"Write down everything you need to do in one long list — no sorting, no ranking, no priorities. New tasks always go at the end.",
											"Work through the list page by page, starting from page 1.",
											"On each page, read through all the tasks first without acting. Then go slowly and ask yourself: what do I want to do?",
											"When a task stands out — feels ready, interesting, or simply right — work on it for as long as feels natural.",
											"When you stop: if the task is done, mark it complete. If not, re-enter it at the end of the list and mark the original complete.",
											"Continue scanning the same page from where you left off.",
											"When you reach the end of the page with nothing standing out, move to the next page.",
											"After finishing the last page, return to the first page that still has active tasks.",
										].map((step, i) => (
											<li key={i} className="flex items-start gap-3">
												<span className="text-foreground font-medium flex-shrink-0 w-4">
													{i + 1}.
												</span>
												<span>{step}</span>
											</li>
										))}
									</ol>
								</div>

								{/* Where the system shines */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										Where the System Truly Shines
									</h4>
									<p>
										AF4 reveals its real power with long-form tasks — the kind
										that take days, weeks, or months to finish. Consider{" "}
										<em>Finish the book Psycho-Cybernetics</em>.
									</p>
									<p>
										You work on it today, get through two chapters, stop
										naturally. You mark it complete and re-enter it at the end
										of the list. Tomorrow it comes back around. You pick it up
										again — another session, another re-entry. This continues
										until one day you mark it complete for the last time and
										don&apos;t re-enter it.
									</p>
									<p>
										What&apos;s left behind in your Completed Tasks view is a
										trail: every session you spent on that book, each one a
										timestamped completed task. Not one entry — many. A record
										of the actual work, not just the final outcome.
									</p>
								</div>

								{/* The pride mechanism */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										The Completed View as a Record of Progress
									</h4>
									<p>
										Most task systems only show you what&apos;s left to do. This
										one shows you what you&apos;ve actually done — and for
										long-form work, that record compounds.
									</p>
									<p>
										Look back at a week where you finished a book: you&apos;ll
										see five or six completed entries, each one a session. Look
										back at a month where you shipped a project: you&apos;ll see
										the deliverables accumulate one by one. The completed view
										becomes a genuine log of output, not just a graveyard of
										checked boxes.
									</p>
									<p>
										This is intentional. Each re-entry creates a new task that
										will become a new completed record. The system doesn&apos;t
										collapse your effort into a single line — it preserves the
										texture of how the work actually happened. That&apos;s worth
										something, both for honest self-assessment and for the quiet
										satisfaction of seeing how much ground you&apos;ve actually
										covered.
									</p>
								</div>

								{/* Why re-entry works */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										Why Re-entry Works Better Than Carrying Forward
									</h4>
									<p>
										In most systems, an incomplete task sits in place and stares
										at you. It accumulates guilt. It starts to feel like
										failure. In AF4, an incomplete task moves to the end of the
										list — it gets a fresh start, without the baggage of having
										been skipped.
									</p>
									<p>
										Re-entry also means the task competes fairly with everything
										else on its new page. If it stands out, you work on it. If
										it doesn&apos;t, something more pressing did — and
										that&apos;s the right outcome. The list self-organizes
										around what&apos;s actually ready to be done, not
										what&apos;s been waiting the longest.
									</p>
									<p>
										The result: long projects make steady, natural progress.
										They don&apos;t get forced or neglected — they surface when
										they&apos;re ready, get worked on, and return to wait their
										turn again. The system holds them without you having to.
									</p>
								</div>

								{/* What standing out means */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										What &quot;Standing Out&quot; Actually Means
									</h4>
									<p>
										This is the part most people overthink. Standing out
										isn&apos;t a dramatic feeling. It&apos;s subtle — a slight
										pull, a readiness, a sense that now is the right time for
										this particular thing. It might be curiosity, momentum from
										earlier work, or simply that the task feels less heavy than
										the others.
									</p>
									<p>
										If you&apos;re scanning and nothing stands out, that&apos;s
										valid information too. Don&apos;t force it. Move to the next
										page. The system is designed to handle this — tasks that
										aren&apos;t ready yet will come back around, and often stand
										out clearly the next time you see them.
									</p>
								</div>

								{/* Rhythm */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										Finding Your Rhythm
									</h4>
									<p>
										AF4 works best when you treat it as a continuous practice
										rather than a strict procedure. You&apos;ll develop a feel
										for the list — which tasks are aging, which keep getting
										skipped, which always stand out immediately. That pattern is
										valuable data about how you actually work, not just how you
										think you work.
									</p>
									<p>
										Add tasks freely. Delete without guilt. Re-enter without
										hesitation. The list is a living document, not a ledger of
										obligations.
									</p>
								</div>

								{/* Practical tip */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										A Practical Note
									</h4>
									<p>
										If a task keeps getting re-entered and never seems to stand
										out, pay attention. It might be too vague — break it into a
										more concrete &quot;Finish X&quot; that your brain can
										actually picture completing. Or it might no longer matter.
										Either way, the system is surfacing something worth
										noticing.
									</p>
									<p>
										Trust what stands out. The list is a tool for your judgment,
										not a replacement for it.
									</p>
								</div>
							</TabsContent>
							<TabsContent
								value="dismissal"
								className="text-sm text-muted-foreground space-y-4 mt-4"
							>
								<h4 className="text-foreground font-medium">
									Why Dismissal Was Removed
								</h4>
								<p>
									The original Autofocus system included a "dismissal" mechanic:
									if you cycled through an entire page without any task standing
									out, all remaining tasks on that page were permanently retired
									— greyed out, not re-entered, gone.
								</p>
								<p>
									This mechanic made sense for its original medium: a paper
									notebook. On paper, you can't delete a task. Dismissal was the
									only way to formally retire something that had stopped being
									relevant. It was the system's self-cleaning mechanism.
								</p>
								<p>
									This app has a delete button. The problem dismissal was
									designed to solve doesn't exist here.
								</p>
								<p>
									Beyond that, dismissal added cognitive overhead — you had to
									track whether you'd completed a "full pass," remember not to
									advance pages too early, and manage a third visual state
									(greyed-out dismissed tasks) cluttering the list. All of that
									friction for a mechanic that most people worked around anyway.
								</p>
								<div>
									<h4 className="text-foreground font-medium mb-2">
										How to handle tasks you're avoiding, now:
									</h4>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>
											If a task is no longer relevant —{" "}
											<strong>delete it</strong>. It's gone, it won't come back,
											no ambiguity.
										</li>
										<li>
											If a task still matters but isn't ready yet —{" "}
											<strong>re-enter it</strong>. It moves to the end of the
											list and comes back around naturally.
										</li>
										<li>
											If a task keeps getting re-entered and never gets done —
											that's a signal worth paying attention to. Either break it
											down into something smaller, or delete it honestly.
										</li>
									</ul>
								</div>
								<p>
									This approach puts the decision consciously in your hands
									rather than delegating it to a page-cycling rule. It's more
									direct, and for how most people actually use a digital task
									list, it's more honest.
								</p>
							</TabsContent>
							<TabsContent
								value="writing"
								className="text-sm text-muted-foreground space-y-6 mt-4"
							>
								{/* Intro */}
								<div className="space-y-3">
									<p>
										How you write a task changes how your brain responds to it.
										The same piece of work written two different ways produces
										two different levels of resistance — and two different
										completion rates.
									</p>
									<p>
										The core principle: describe the <strong>outcome</strong>,
										not the activity. Your brain responds to clear end states. A
										task that tells you what the world looks like when it&apos;s
										done is easier to start, easier to finish, and easier to
										re-enter when it&apos;s incomplete.
									</p>
								</div>

								{/* The test */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										The &quot;Done&quot; Test
									</h4>
									<p>
										From David Allen: can you picture what &quot;done&quot;
										looks like? With <em>Finish the book Psycho-Cybernetics</em>{" "}
										you can — the book is closed, it&apos;s on the shelf,
										you&apos;re moving on. With{" "}
										<em>Read the book Psycho-Cybernetics</em> the image is
										fuzzier — reading when, reading how much, reading actively
										or passively?
									</p>
									<p>
										&quot;Read 10 pages&quot; has a hidden problem in AF4
										specifically: once completed, the real goal disappears from
										your list. You&apos;d have to manually reconstruct it as
										&quot;Read next 10 pages&quot;, then again, then again.
										That&apos;s the friction this system is designed to
										eliminate.
									</p>
								</div>

								{/* Formula + examples */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">The Formula</h4>
									<p className="font-mono text-xs text-foreground bg-secondary px-3 py-2 rounded">
										Finish + [specific deliverable] + [enough context to be
										unambiguous]
									</p>
									<ul className="space-y-2 ml-1">
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
											<li key={before} className="flex items-start gap-2">
												<span className="line-through opacity-40 flex-1">
													{before}
												</span>
												<span className="opacity-40">→</span>
												<strong className="text-foreground flex-1">
													{after}
												</strong>
											</li>
										))}
									</ul>
								</div>

								{/* Apply to long-form work */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										Applying This to Long-form Work
									</h4>
									<ul className="space-y-2 ml-1">
										<li>
											<strong className="text-foreground">Books</strong> — one
											&quot;Finish&quot; task per book. Re-enters naturally when
											incomplete.
										</li>
										<li>
											<strong className="text-foreground">Courses</strong> —
											break by module, not by hour. A 2-hour course is one task;
											a 40-hour course is one task per module.
										</li>
										<li>
											<strong className="text-foreground">Projects</strong> —
											break by deliverable, not by activity. &quot;Finish the
											first draft of the proposal&quot; not &quot;Work on the
											proposal.&quot;
										</li>
									</ul>
								</div>

								{/* When open-ended is right */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										When Open-Ended Framing Is the Right Choice
									</h4>
									<p>
										Two situations where &quot;Finish&quot; is the wrong frame
										and open-ended is genuinely better:
									</p>
									<ul className="space-y-3 ml-1">
										<li>
											<strong className="text-foreground">
												Exploratory work
											</strong>{" "}
											— when the output of doing the task is the discovery of
											what to do next. &quot;Work on project X&quot; is valid
											when you genuinely don&apos;t know what the next concrete
											deliverable is yet. The task is to go in, gain clarity,
											and emerge with something more specific. Once you do —
											that insight becomes the next &quot;Finish&quot; task. Use
											open-ended framing as a bridge, not a permanent home.
										</li>
										<li>
											<strong className="text-foreground">
												Experience-driven tasks
											</strong>{" "}
											— travel, exploration, serendipity. &quot;Wander
											Taipei&apos;s old quarter&quot; is a better task than
											&quot;Visit X restaurant&quot; when the point is to be
											surprised. Over-specifying kills the experience you were
											trying to have. Here the outcome <em>is</em> the openness
											— and that&apos;s worth protecting.
										</li>
									</ul>
									<p>
										The distinction that matters:{" "}
										<strong className="text-foreground">
											intentional openness
										</strong>{" "}
										vs{" "}
										<strong className="text-foreground">lazy vagueness</strong>.
										The first is a valid task type. The second is a task that
										needs more thinking before it enters the list.
										&quot;Finish&quot; is a tool for clarity, not a rule to
										follow blindly.
									</p>
								</div>

								{/* Recurring avoidance */}
								<div className="space-y-3">
									<h4 className="text-foreground font-medium">
										When a Task Keeps Getting Re-entered and Never Gets Done
									</h4>
									<p>
										That&apos;s a signal, not a failure. Either the task is too
										vague — break it into a smaller, more concrete
										&quot;Finish&quot; — or it no longer matters. Delete it
										honestly. A task you keep avoiding is the system telling you
										something worth listening to.
									</p>
								</div>
							</TabsContent>
							<TabsContent
								value="tagging"
								className="text-sm text-muted-foreground space-y-6 mt-4"
							>
								{/* Intro */}
								<div className="space-y-3">
									<p>
										Tags aren't just labels — they tell you how to{" "}
										<em>approach</em> a task before you even start it. Each tag
										carries a different question:
									</p>

									<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
										{[
											{ emoji: "🎯", q: "What does done look like?" },
											{ emoji: "🧭", q: "What will I learn?" },
											{ emoji: "⚡", q: "Can I knock this out now?" },
											{ emoji: "🔧", q: "Looks quick but has steps?" },
										].map(({ emoji, q }) => (
											<div
												key={emoji}
												className="bg-secondary rounded-lg px-3 py-2 text-center space-y-1"
											>
												<div className="text-lg">{emoji}</div>
												<p className="text-xs leading-snug">{q}</p>
											</div>
										))}
									</div>
								</div>

								{/* Tag definitions */}
								{TAG_GUIDE.map((tag) => (
									<div key={tag.label} className="space-y-2">
										<h4 className="text-foreground font-medium flex items-center gap-2">
											<span>{tag.emoji}</span>
											<span>{tag.label}</span>
										</h4>
										<p>{tag.description}</p>
										<ul className="space-y-1 ml-1">
											{tag.examples.map((example) => (
												<li
													key={example}
													className="flex items-start gap-2 text-xs"
												>
													<span className="opacity-40 mt-0.5">—</span>
													<span className="italic">{example}</span>
												</li>
											))}
										</ul>
										{tag.note && (
											<p className="text-xs bg-secondary px-3 py-2 rounded">
												{tag.note}
											</p>
										)}
									</div>
								))}

								{/* How tags flow */}
								<div className="space-y-3 border-t border-border pt-4">
									<h4 className="text-foreground font-medium">
										How Tags Flow in Practice
									</h4>
									<p>A task often moves through types as it matures:</p>
									<div className="bg-secondary rounded-lg px-4 py-3 space-y-1 font-mono text-xs">
										<p>🧭 Explore content strategy direction</p>
										<p className="opacity-50 pl-4">↓ you emerge with clarity</p>
										<p>🎯 Finish the three-pillar content framework doc</p>
										<p className="opacity-50 pl-4">
											↓ along the way you need to
										</p>
										<p>⚡ Read the Wes Kao newsletter on positioning</p>
									</div>
								</div>

								{/* No tag */}
								<div className="space-y-2 border-t border-border pt-4">
									<h4 className="text-foreground font-medium">No tag?</h4>
									<p>
										That's fine too. Untagged tasks are honest — it means you
										haven't decided how to approach it yet. Use the{" "}
										<strong className="text-foreground">No 🏷️</strong> filter to
										surface them and tag in bulk when you're ready.
									</p>
								</div>

								{/* Re-entry table */}
								<div className="space-y-3 border-t border-border pt-4">
									<h4 className="text-foreground font-medium">
										Which tasks get re-entered most?
									</h4>
									<p>
										Re-entry is a signal, not a failure. Different tag types
										have different re-entry patterns — understanding yours helps
										you write better tasks from the start.
									</p>

									<div className="overflow-x-auto">
										<table className="w-full text-xs border-collapse">
											<thead>
												<tr className="border-b border-border">
													<th className="text-left py-2 pr-4 text-foreground font-medium">
														Tag
													</th>
													<th className="text-left py-2 pr-4 text-foreground font-medium">
														Re-entry rate
													</th>
													<th className="text-left py-2 text-foreground font-medium">
														Why it happens
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border/50">
												<tr>
													<td className="py-2.5 pr-4 whitespace-nowrap">
														🎯 Finish
													</td>
													<td className="py-2.5 pr-4 whitespace-nowrap text-amber-500">
														Medium
													</td>
													<td className="py-2.5 text-muted-foreground">
														Deliverable was too large. A "Finish" that keeps
														coming back usually needs to be broken into smaller
														pieces.
													</td>
												</tr>
												<tr>
													<td className="py-2.5 pr-4 whitespace-nowrap">
														🧭 Explore
													</td>
													<td className="py-2.5 pr-4 whitespace-nowrap text-amber-500">
														Medium–High
													</td>
													<td className="py-2.5 text-muted-foreground">
														Scope-dependent. A narrow Explore closes in 1–2
														sessions. A wide one can cycle indefinitely — that's
														not failure, it's the nature of open terrain. Each
														re-entry should produce a more specific Finish task
														as a byproduct.
													</td>
												</tr>
												<tr>
													<td className="py-2.5 pr-4 whitespace-nowrap">
														⚡ Quick
													</td>
													<td className="py-2.5 pr-4 whitespace-nowrap text-green-500">
														Very low
													</td>
													<td className="py-2.5 text-muted-foreground">
														By definition, Quick tasks are one-shot. If a Quick
														gets re-entered, it was misclassified — it's either
														blocked by something external, or it's actually a
														Handle in disguise.
													</td>
												</tr>
												<tr>
													<td className="py-2.5 pr-4 whitespace-nowrap">
														🔧 Handle
													</td>
													<td className="py-2.5 pr-4 whitespace-nowrap text-amber-500">
														Medium
													</td>
													<td className="py-2.5 text-muted-foreground">
														Re-enters because of waiting periods and external
														dependencies. Each re-entry is expected. Keep going
														until it closes.
													</td>
												</tr>
											</tbody>
										</table>
									</div>

									<p className="text-xs bg-secondary px-3 py-2.5 rounded">
										<span className="block">
											<strong className="text-foreground">
												Rule of thumb:
											</strong>{" "}
											if a task has been re-entered more than 3 times, stop and
											ask — is it blocked, too big, or no longer relevant?
										</span>
										<span className="block mt-1">
											<strong className="text-foreground">
												Exception for Explore:
											</strong>{" "}
											wide exploration tasks are supposed to recycle. The signal
											to watch isn't re-entry count — it's whether each session
											is still producing new clarity or new Finish tasks. If it
											stops yielding anything concrete, the topic may have run
											its course.
										</span>
									</p>
								</div>
							</TabsContent>
						</div>
					</Tabs>
					<p className="text-xs border-t border-border pt-4 mt-4 text-muted-foreground">
						Learn more at{" "}
						<a
							href="http://markforster.squarespace.com/autofocus-system/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-af4-olive hover:underline"
						>
							Mark Forster&apos;s website
						</a>
					</p>
				</DialogContent>
			</Dialog>
		</>
	);
}
