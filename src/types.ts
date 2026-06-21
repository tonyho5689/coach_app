export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'veryActive';

export type ExerciseType = 'squats' | 'pushups';

export interface MacroTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface UserProfile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  dietaryRestrictions: string[];
  targets: MacroTargets;
  createdAt: string; // ISO
}

export interface Meal {
  id: string;
  timestamp: string; // ISO
  name: string;
  imageUri?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string; // contextual note vs the user's goal
  source: 'ai' | 'mock';
}

export interface Workout {
  id: string;
  timestamp: string; // ISO
  exercise: ExerciseType;
  reps: number;
  durationSec: number;
  formScore: number; // 0-100
  tips: string[];
}

export interface WeightEntry {
  date: string; // ISO date (YYYY-MM-DD)
  weightKg: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  // Optional list of grounding facts surfaced to the user for transparency.
  grounding?: string[];
}

export interface AppData {
  profile: UserProfile | null;
  meals: Meal[];
  workouts: Workout[];
  weights: WeightEntry[];
  chat: ChatMessage[];
}
