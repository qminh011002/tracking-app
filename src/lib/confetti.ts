import type { Options as ConfettiOptions } from "canvas-confetti";

let cachedConfetti: ((
  options?: ConfettiOptions,
) => Promise<null> | null) | null = null;

async function getConfetti() {
  if (cachedConfetti) return cachedConfetti;
  const module = await import("canvas-confetti");
  cachedConfetti = module.default;
  return cachedConfetti;
}

export async function launchConfettiParty() {
  const confetti = await getConfetti();
  if (!confetti) return;

  const base = {
    spread: 70,
    startVelocity: 26,
    ticks: 220,
    gravity: 1.2,
  } satisfies ConfettiOptions;

  void confetti({
    ...base,
    particleCount: 80,
    angle: 250,
    origin: { x: 0.05, y: 0.02 },
  });
  void confetti({
    ...base,
    particleCount: 80,
    angle: 290,
    origin: { x: 0.95, y: 0.02 },
  });
  void confetti({
    ...base,
    particleCount: 50,
    spread: 100,
    startVelocity: 30,
    angle: 270,
    origin: { x: 0.5, y: 0.02 },
  });
}
