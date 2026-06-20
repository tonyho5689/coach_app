import { GOAL_LABELS } from './nutrition';
import {
  ChatMessage,
  Meal,
  UserProfile,
  WeightEntry,
  Workout,
} from './types';

// ---------------------------------------------------------------------------
// MVP NOTE: All "AI" features below return built-in, hard-coded responses.
// There is no external LLM/API call — the meal analyzer and the Advisor run
// fully on-device so the demo works anywhere (incl. the Vercel web build) with
// zero configuration or keys. The Advisor responses are still computed from the
// user's real logged data so they reference actual numbers.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Meal "vision" analysis (hard-coded estimates)
// ---------------------------------------------------------------------------

export interface MealAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'mock';
}

const SAMPLE_MEALS: Omit<MealAnalysis, 'source'>[] = [
  { name: 'Grilled chicken & roasted veg', calories: 480, protein: 44, carbs: 30, fat: 18 },
  { name: 'Salmon poke bowl', calories: 560, protein: 36, carbs: 58, fat: 16 },
  { name: 'Veggie omelette & toast', calories: 420, protein: 26, carbs: 30, fat: 22 },
  { name: 'Beef & bean burrito', calories: 640, protein: 34, carbs: 66, fat: 24 },
  { name: 'Greek yogurt parfait', calories: 320, protein: 24, carbs: 40, fat: 8 },
  { name: 'Steak, potatoes & greens', calories: 720, protein: 48, carbs: 52, fat: 32 },
];

function sampleMeal(): MealAnalysis {
  const pick = SAMPLE_MEALS[Math.floor(Math.random() * SAMPLE_MEALS.length)];
  // Add a little jitter so repeated captures feel real.
  const j = (n: number, p = 0.08) =>
    Math.round(n * (1 + (Math.random() * 2 - 1) * p));
  return {
    name: pick.name,
    calories: j(pick.calories),
    protein: j(pick.protein),
    carbs: j(pick.carbs),
    fat: j(pick.fat),
    source: 'mock',
  };
}

// Signature kept compatible with the screens; the image is intentionally unused
// in this MVP build.
export async function analyzeMealImage(
  _base64Jpeg: string | undefined,
  _profile: UserProfile | null,
): Promise<MealAnalysis> {
  // Brief simulated latency so the "analyzing" state is visible.
  await new Promise((r) => setTimeout(r, 900));
  return sampleMeal();
}

// ---------------------------------------------------------------------------
// Advisor chat — hard-coded replies grounded in the user's real data
// ---------------------------------------------------------------------------

export interface AdvisorContext {
  profile: UserProfile;
  todayMeals: Meal[];
  recentMeals: Meal[];
  recentWorkouts: Workout[];
  weights: WeightEntry[];
  todayTotals: { calories: number; protein: number; carbs: number; fat: number };
}

// Human-readable grounding facts. Shown in the UI so the data access is visible,
// and used to build the hard-coded reply below.
export function buildGroundingFacts(ctx: AdvisorContext): string[] {
  const { profile, todayTotals, recentWorkouts, weights } = ctx;
  const t = profile.targets;
  const facts: string[] = [];

  const calLeft = t.calories - todayTotals.calories;
  facts.push(
    `Today: ${todayTotals.calories}/${t.calories} kcal (${calLeft >= 0 ? `${calLeft} left` : `${-calLeft} over`}).`,
  );
  const protLeft = t.protein - todayTotals.protein;
  facts.push(
    `Protein today: ${todayTotals.protein}/${t.protein}g (${protLeft > 0 ? `${protLeft}g under` : 'target met'}).`,
  );

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const thisWeek = recentWorkouts.filter(
    (w) => new Date(w.timestamp) >= weekStart,
  );
  const didLegs = thisWeek.some((w) => w.exercise === 'squats');
  facts.push(
    `Workouts in last 7 days: ${thisWeek.length}${thisWeek.length ? ` (${didLegs ? 'incl. legs' : 'no leg day yet'})` : ''}.`,
  );

  if (weights.length >= 2) {
    const first = weights[0].weightKg;
    const last = weights[weights.length - 1].weightKg;
    const diff = +(last - first).toFixed(1);
    facts.push(
      `Weight trend: ${first}→${last}kg (${diff <= 0 ? `${diff}kg` : `+${diff}kg`}).`,
    );
  }
  facts.push(
    `Goal: ${GOAL_LABELS[profile.goal]}; restrictions: ${profile.dietaryRestrictions.join(', ') || 'none'}.`,
  );
  return facts;
}

// Deterministic, data-aware hard-coded reply.
function buildAdvisorReply(question: string, ctx: AdvisorContext): string {
  const q = question.toLowerCase();
  const t = ctx.profile.targets;
  const protLeft = t.protein - ctx.todayTotals.protein;
  const calLeft = t.calories - ctx.todayTotals.calories;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const thisWeek = ctx.recentWorkouts.filter(
    (w) => new Date(w.timestamp) >= weekStart,
  );
  const didLegs = thisWeek.some((w) => w.exercise === 'squats');

  if (q.includes('dinner') || q.includes('eat') || q.includes('meal') || q.includes('food')) {
    return (
      `You've got ${calLeft > 0 ? calLeft : 0} kcal left today and you're ${protLeft > 0 ? `${protLeft}g under` : 'already at'} your ${t.protein}g protein target. ` +
      `I'd go for something lean and high-protein — grilled chicken or salmon with veg fits your "${GOAL_LABELS[ctx.profile.goal].toLowerCase()}" goal nicely. ` +
      `Aim for ~${Math.max(30, protLeft)}g protein to close the gap.`
    );
  }
  if (q.includes('protein')) {
    return protLeft > 0
      ? `You're at ${ctx.todayTotals.protein}g of your ${t.protein}g target — about ${protLeft}g short. A scoop of whey or a chicken breast (~30g) would get you there.`
      : `Nice — you've already hit ${ctx.todayTotals.protein}g protein, at or above your ${t.protein}g target for today. 💪`;
  }
  if (q.includes('week') || q.includes('how am i') || q.includes('progress') || q.includes('doing')) {
    const wTrend =
      ctx.weights.length >= 2
        ? `Your weight is trending ${(ctx.weights[ctx.weights.length - 1].weightKg - ctx.weights[0].weightKg).toFixed(1)}kg over the last month — right in line with your goal. `
        : '';
    return (
      `${wTrend}You've logged ${thisWeek.length} workout${thisWeek.length === 1 ? '' : 's'} this week${didLegs ? '' : ' but no leg day yet'}. ` +
      `${didLegs ? 'Great balance.' : 'Try fitting in some squats to round things out.'} Keep the protein consistent and you're on track.`
    );
  }
  if (q.includes('workout') || q.includes('train') || q.includes('exercise') || q.includes('leg')) {
    return didLegs
      ? `You've already hit legs this week and logged ${thisWeek.length} session${thisWeek.length === 1 ? '' : 's'} total. A push-up session would balance your upper body next.`
      : `You haven't trained legs in the last 7 days — a squat session today would balance out your week. You've done ${thisWeek.length} workout${thisWeek.length === 1 ? '' : 's'} so far.`;
  }
  return (
    `Based on your log: ${ctx.todayTotals.calories}/${t.calories} kcal and ${ctx.todayTotals.protein}/${t.protein}g protein today, ` +
    `with ${thisWeek.length} workout${thisWeek.length === 1 ? '' : 's'} this week. ` +
    `For your "${GOAL_LABELS[ctx.profile.goal].toLowerCase()}" goal, keep protein high and stay just under your calorie target. What would you like to dig into?`
  );
}

export async function askAdvisor(
  question: string,
  ctx: AdvisorContext,
  _history: ChatMessage[],
): Promise<string> {
  // Brief simulated latency so the "thinking" state is visible.
  await new Promise((r) => setTimeout(r, 700));
  return buildAdvisorReply(question, ctx);
}
