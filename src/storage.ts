import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChatMessage,
  Meal,
  UserProfile,
  WeightEntry,
  Workout,
} from './types';

const KEYS = {
  profile: 'coach.profile',
  meals: 'coach.meals',
  workouts: 'coach.workouts',
  weights: 'coach.weights',
  chat: 'coach.chat',
  seeded: 'coach.seeded.v1',
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  async getProfile(): Promise<UserProfile | null> {
    return readJSON<UserProfile | null>(KEYS.profile, null);
  },
  async setProfile(profile: UserProfile): Promise<void> {
    await writeJSON(KEYS.profile, profile);
  },
  async getMeals(): Promise<Meal[]> {
    return readJSON<Meal[]>(KEYS.meals, []);
  },
  async setMeals(meals: Meal[]): Promise<void> {
    await writeJSON(KEYS.meals, meals);
  },
  async getWorkouts(): Promise<Workout[]> {
    return readJSON<Workout[]>(KEYS.workouts, []);
  },
  async setWorkouts(workouts: Workout[]): Promise<void> {
    await writeJSON(KEYS.workouts, workouts);
  },
  async getWeights(): Promise<WeightEntry[]> {
    return readJSON<WeightEntry[]>(KEYS.weights, []);
  },
  async setWeights(weights: WeightEntry[]): Promise<void> {
    await writeJSON(KEYS.weights, weights);
  },
  async getChat(): Promise<ChatMessage[]> {
    return readJSON<ChatMessage[]>(KEYS.chat, []);
  },
  async setChat(chat: ChatMessage[]): Promise<void> {
    await writeJSON(KEYS.chat, chat);
  },
  async isSeeded(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.seeded)) === 'true';
  },
  async markSeeded(): Promise<void> {
    await AsyncStorage.setItem(KEYS.seeded, 'true');
  },
  async reset(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
