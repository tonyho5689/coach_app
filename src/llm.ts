import { GOAL_LABELS } from './nutrition';
import {
  ChatMessage,
  Meal,
  UserProfile,
  WeightEntry,
  Workout,
} from './types';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim();
const MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function hasApiKey(): boolean {
  return !!API_KEY;
}

async function callAnthropic(
  body: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY as string,
      'anthropic-version': '2023-06-01',
      // Allows direct calls from non-server (RN/browser) environments.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${detail}`);
  }
  const json = await res.json();
  const parts = (json.content ?? []) as Array<{ type: string; text?: string }>;
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join('')
    .trim();
}

// ---------------------------------------------------------------------------
// Meal vision analysis
// ---------------------------------------------------------------------------

export interface MealAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'ai' | 'mock';
}

const MOCK_MEALS: Omit<MealAnalysis, 'source'>[] = [
  { name: 'Grilled chicken & roasted veg', calories: 480, protein: 44, carbs: 30, fat: 18 },
  { name: 'Salmon poke bowl', calories: 560, protein: 36, carbs: 58, fat: 16 },
  { name: 'Veggie omelette & toast', calories: 420, protein: 26, carbs: 30, fat: 22 },
  { name: 'Beef & bean burrito', calories: 640, protein: 34, carbs: 66, fat: 24 },
  { name: 'Greek yogurt parfait', calories: 320, protein: 24, carbs: 40, fat: 8 },
  { name: 'Steak, potatoes & greens', calories: 720, protein: 48, carbs: 52, fat: 32 },
];

function mockMeal(): MealAnalysis {
  const pick = MOCK_MEALS[Math.floor(Math.random() * MOCK_MEALS.length)];
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

export async function analyzeMealImage(
  base64Jpeg: string | undefined,
  profile: UserProfile | null,
): Promise<MealAnalysis> {
  if (!API_KEY || !base64Jpeg) {
    // Simulate network latency for a realistic demo feel.
    await new Promise((r) => setTimeout(r, 900));
    return mockMeal();
  }
  try {
    const restrictions =
      profile?.dietaryRestrictions?.length
        ? `The user notes these dietary restrictions: ${profile.dietaryRestrictions.join(', ')}.`
        : '';
    const text = await callAnthropic({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Jpeg,
              },
            },
            {
              type: 'text',
              text:
                `Estimate the nutrition of this meal. ${restrictions} ` +
                'Respond ONLY with a compact JSON object, no markdown, with keys: ' +
                'name (short string), calories (int), protein (int grams), carbs (int grams), fat (int grams).',
            },
          ],
        },
      ],
    });
    const parsed = JSON.parse(extractJson(text));
    return {
      name: String(parsed.name ?? 'Analyzed meal'),
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round(Number(parsed.protein) || 0),
      carbs: Math.round(Number(parsed.carbs) || 0),
      fat: Math.round(Number(parsed.fat) || 0),
      source: 'ai',
    };
  } catch (e) {
    console.warn('Meal analysis failed, falling back to mock:', e);
    return mockMeal();
  }
}

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

// ---------------------------------------------------------------------------
// Advisor chat — grounded in the user's real data
// ---------------------------------------------------------------------------

export interface AdvisorContext {
  profile: UserProfile;
  todayMeals: Meal[];
  recentMeals: Meal[];
  recentWorkouts: Workout[];
  weights: WeightEntry[];
  todayTotals: { calories: number; protein: number; carbs: number; fat: number };
}

// Human-readable grounding facts. Shown in the UI AND fed to the model so the
// answer references the user's actual numbers.
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

function buildSystemPrompt(ctx: AdvisorContext): string {
  const { profile } = ctx;
  const facts = buildGroundingFacts(ctx);
  const recentMealLines = ctx.recentMeals
    .slice(0, 8)
    .map(
      (m) =>
        `- ${new Date(m.timestamp).toLocaleDateString()} ${m.name}: ${m.calories}kcal P${m.protein}/C${m.carbs}/F${m.fat}`,
    )
    .join('\n');
  const workoutLines = ctx.recentWorkouts
    .slice(0, 6)
    .map(
      (w) =>
        `- ${new Date(w.timestamp).toLocaleDateString()} ${w.exercise} x${w.reps} (form ${w.formScore})`,
    )
    .join('\n');

  return [
    'You are Coach, a friendly, expert AI health & fitness coach inside a tracking app.',
    'You have access to the user\'s real logged data. ALWAYS ground your advice in their actual numbers and reference them specifically.',
    'Be concise (2-4 short sentences), encouraging, and practical. Avoid medical disclaimers unless truly necessary.',
    '',
    `User: ${profile.name}, ${profile.age}y ${profile.sex}, ${profile.heightCm}cm, ${profile.weightKg}kg.`,
    `Daily targets: ${profile.targets.calories} kcal, ${profile.targets.protein}g protein, ${profile.targets.carbs}g carbs, ${profile.targets.fat}g fat.`,
    '',
    'KEY FACTS (today + recent):',
    ...facts.map((f) => `- ${f}`),
    '',
    'Recent meals:',
    recentMealLines || '- none logged',
    '',
    'Recent workouts:',
    workoutLines || '- none logged',
  ].join('\n');
}

// Deterministic, data-aware mock so the demo works with no API key.
function mockAdvisorReply(question: string, ctx: AdvisorContext): string {
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
  history: ChatMessage[],
): Promise<string> {
  if (!API_KEY) {
    await new Promise((r) => setTimeout(r, 700));
    return mockAdvisorReply(question, ctx);
  }
  try {
    const priorTurns = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text }));
    const text = await callAnthropic({
      model: MODEL,
      max_tokens: 400,
      system: buildSystemPrompt(ctx),
      messages: [...priorTurns, { role: 'user', content: question }],
    });
    return text || mockAdvisorReply(question, ctx);
  } catch (e) {
    console.warn('Advisor call failed, falling back to mock:', e);
    return mockAdvisorReply(question, ctx);
  }
}
