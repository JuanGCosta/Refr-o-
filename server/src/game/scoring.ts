import { ROUND_DURATION_MS } from "@shared/types";

const MAX_POINTS = 1000;
const MIN_POINTS_CORRECT = 300;
const FASTEST_BONUS = 100;
const STREAK_BONUS_PER_STEP = 25;
const STREAK_BONUS_CAP_STEPS = 6;

/** Base points decay linearly from MAX_POINTS to MIN_POINTS_CORRECT across the round duration. */
export function basePointsForTime(timeMs: number, durationMs: number = ROUND_DURATION_MS): number {
  const clamped = Math.max(0, Math.min(timeMs, durationMs));
  const ratio = clamped / durationMs;
  const points = MAX_POINTS - ratio * (MAX_POINTS - MIN_POINTS_CORRECT);
  return Math.round(points);
}

export function streakBonus(streakAfterThisAnswer: number): number {
  const steps = Math.min(Math.max(streakAfterThisAnswer - 1, 0), STREAK_BONUS_CAP_STEPS);
  return steps * STREAK_BONUS_PER_STEP;
}

export interface ScoreCalcInput {
  correct: boolean;
  timeMs: number | null;
  isFastestCorrect: boolean;
  previousStreak: number;
  durationMs?: number;
}

export interface ScoreCalcResult {
  pointsEarned: number;
  newStreak: number;
}

export function calculateScore(input: ScoreCalcInput): ScoreCalcResult {
  if (!input.correct || input.timeMs === null) {
    return { pointsEarned: 0, newStreak: 0 };
  }
  const newStreak = input.previousStreak + 1;
  const base = basePointsForTime(input.timeMs, input.durationMs);
  const fastest = input.isFastestCorrect ? FASTEST_BONUS : 0;
  const streak = streakBonus(newStreak);
  return { pointsEarned: base + fastest + streak, newStreak };
}
