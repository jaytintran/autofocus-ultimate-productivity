/** Play a subtle completion sound effect */
export function playCompletionSound() {
	try {
		const ctx = new AudioContext();
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();

		oscillator.connect(gain);
		gain.connect(ctx.destination);

		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(880, ctx.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(
			1200,
			ctx.currentTime + 0.1,
		);

		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + 0.3);
	} catch {
		// Silently fail if AudioContext is unavailable
	}
}
