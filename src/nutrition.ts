import {
  ActivityLevel,
  Goal,
  MacroTargets,
  Meal,
  Sex,
  UserProfile,
} from './types';

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  veryActive: 'Very active (athlete)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain',
  gain: 'Gain muscle',
};

// Mifflin-St Jeor equation for Basal Metabolic Rate.
export function calcBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// Total Daily Energy Expenditure adjusted by goal, plus a macro split.
export function computeTargets(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
  goal: Goal,
): MacroTargets {
  const bmr = calcBMR(sex, weightKg, heightCm, age);
  let calories = bmr * ACTIVITY_FACTORS[activity];

  if (goal === 'lose') calories -= 450;
  if (goal === 'gain') calories += 350;

  calories = Math.round(calories / 10) * 10;

  // Protein scales with goal; higher for muscle gain / fat loss preservation.
  const proteinPerKg = goal === 'maintain' ? 1.6 : 2.0;
  const protein = Math.round(weightKg * proteinPerKg);

  // Fat ~25% of calories.
  const fat = Math.round((calories * 0.25) / 9);

  // Carbs fill the remainder.
  const remaining = calories - (protein * 4 + fat * 9);
  const carbs = Math.max(0, Math.round(remaining / 4));

  return { calories, protein, carbs, fat };
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumMeals(meals: Meal[]): DayTotals {
  return meals.reduce<DayTotals>(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function mealsForDay(meals: Meal[], ref: Date = new Date()): Meal[] {
  return meals.filter((m) => isSameDay(m.timestamp, ref));
}

// Build a short human note comparing a meal to the user's daily targets.
export function noteForMeal(
  meal: Pick<Meal, 'calories' | 'protein'>,
  profile: UserProfile,
): string {
  const { goal, targets } = profile;
  const calShare = Math.round((meal.calories / targets.calories) * 100);
  const proteinShare = Math.round((meal.protein / targets.protein) * 100);

  if (goal === 'gain' && meal.protein >= 30) {
    return `Solid ${meal.protein}g protein — great for muscle gain (${proteinShare}% of today's target).`;
  }
  if (goal === 'lose' && calShare > 45) {
    return `That's ${calShare}% of your daily calories — a big hit for a fat-loss day. Keep dinner light.`;
  }
  if (meal.protein >= 25) {
    return `Good protein hit (${meal.protein}g, ${proteinShare}% of target). On track.`;
  }
  return `${meal.calories} kcal — ${calShare}% of today's budget. Add a protein source to round it out.`;
}
