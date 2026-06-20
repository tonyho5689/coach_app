import { computeTargets } from './nutrition';
import {
  ChatMessage,
  Meal,
  UserProfile,
  WeightEntry,
  Workout,
} from './types';

function id(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Build an ISO timestamp `daysAgo` days ago at the given hour/minute.
function at(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function buildSeedProfile(): UserProfile {
  const sex = 'male' as const;
  const weightKg = 82;
  const heightCm = 178;
  const age = 29;
  const activityLevel = 'moderate' as const;
  const goal = 'lose' as const;
  return {
    name: 'Alex',
    age,
    sex,
    heightCm,
    weightKg,
    goal,
    activityLevel,
    dietaryRestrictions: ['No shellfish'],
    targets: computeTargets(sex, weightKg, heightCm, age, activityLevel, goal),
    createdAt: at(6, 8),
  };
}

const M = (
  daysAgo: number,
  hour: number,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  note: string,
): Meal => ({
  id: id(),
  timestamp: at(daysAgo, hour),
  name,
  calories,
  protein,
  carbs,
  fat,
  note,
  source: 'mock',
});

export function buildSeedMeals(): Meal[] {
  return [
    // Today — intentionally a bit short on protein so the Advisor has something to say.
    M(0, 8, 'Greek yogurt + berries & granola', 340, 24, 42, 8, 'Great high-protein start to the day.'),
    M(0, 13, 'Chicken & quinoa bowl', 520, 42, 48, 16, 'Balanced lunch — right on target for a fat-loss day.'),

    // Yesterday
    M(1, 8, 'Oatmeal with banana & peanut butter', 410, 14, 60, 14, 'Good pre-workout carbs, light on protein.'),
    M(1, 13, 'Turkey wrap & side salad', 480, 35, 44, 18, 'Solid lunch, on target.'),
    M(1, 19, 'Salmon, rice & broccoli', 610, 40, 52, 26, 'Great omega-3 + protein dinner.'),

    // 2 days ago
    M(2, 9, 'Three-egg veggie omelette', 380, 26, 8, 26, 'High protein, low carb — perfect for fat loss.'),
    M(2, 13, 'Burrito bowl (no cheese)', 640, 38, 70, 20, 'A bit carb-heavy but within budget.'),
    M(2, 20, 'Stir-fry tofu & noodles', 520, 24, 62, 18, 'Decent dinner; could use more protein.'),

    // 3 days ago
    M(3, 8, 'Protein smoothie', 300, 30, 30, 6, 'Fast, high-protein breakfast.'),
    M(3, 13, 'Grilled chicken Caesar', 560, 44, 22, 32, 'High protein; watch the dressing fat.'),
    M(3, 19, 'Beef tacos (2)', 590, 32, 50, 28, 'Tasty — slightly over on fat.'),

    // 4 days ago
    M(4, 9, 'Avocado toast & eggs', 450, 20, 38, 24, 'Good fats; moderate protein.'),
    M(4, 14, 'Poke bowl', 520, 36, 56, 14, 'Lean protein, great choice.'),

    // 5 days ago
    M(5, 8, 'Cottage cheese & fruit', 290, 28, 24, 8, 'Excellent protein-to-calorie ratio.'),
    M(5, 19, 'Pasta bolognese', 680, 34, 78, 24, 'Over budget — heavy carb dinner.'),
  ];
}

const W = (
  daysAgo: number,
  hour: number,
  exercise: 'squats' | 'pushups',
  reps: number,
  durationSec: number,
  formScore: number,
  tips: string[],
): Workout => ({
  id: id(),
  timestamp: at(daysAgo, hour),
  exercise,
  reps,
  durationSec,
  formScore,
  tips,
});

export function buildSeedWorkouts(): Workout[] {
  return [
    W(1, 18, 'pushups', 28, 95, 82, [
      'Keep your core braced to stop your hips sagging.',
      'Lower until elbows hit 90° for full range.',
    ]),
    W(2, 7, 'squats', 35, 150, 88, [
      'Great depth — keep driving through your heels.',
    ]),
    W(4, 18, 'pushups', 22, 80, 76, [
      'Slow the descent to 2 seconds for more control.',
      'Tuck elbows ~45° to protect your shoulders.',
    ]),
    W(5, 8, 'squats', 40, 165, 84, [
      'Solid pace. Keep your chest up at the bottom.',
    ]),
  ];
}

export function buildSeedWeights(): WeightEntry[] {
  // Gentle downward trend matching the "lose" goal.
  return [
    { date: dateStr(28), weightKg: 84.5 },
    { date: dateStr(21), weightKg: 84.0 },
    { date: dateStr(14), weightKg: 83.3 },
    { date: dateStr(7), weightKg: 82.6 },
    { date: dateStr(2), weightKg: 82.1 },
    { date: dateStr(0), weightKg: 82.0 },
  ];
}

export function buildSeedChat(): ChatMessage[] {
  return [
    {
      id: id(),
      role: 'assistant',
      text: "Hey Alex 👋 I'm your Coach. I can see your logged meals, workouts, and weight trend, so ask me anything — like \"what should I eat for dinner?\" or \"how's my week going?\"",
      timestamp: at(0, 7),
    },
  ];
}
