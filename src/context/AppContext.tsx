import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  buildSeedChat,
  buildSeedMeals,
  buildSeedProfile,
  buildSeedWeights,
  buildSeedWorkouts,
} from '../seed';
import { storage } from '../storage';
import {
  ChatMessage,
  Meal,
  UserProfile,
  WeightEntry,
  Workout,
} from '../types';

interface AppState {
  hydrated: boolean;
  profile: UserProfile | null;
  meals: Meal[];
  workouts: Workout[];
  weights: WeightEntry[];
  chat: ChatMessage[];
  saveProfile: (p: UserProfile) => Promise<void>;
  addMeal: (m: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  addWorkout: (w: Workout) => Promise<void>;
  addWeight: (w: WeightEntry) => Promise<void>;
  appendChat: (m: ChatMessage) => Promise<void>;
  resetAll: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);

  // Hydrate from storage on launch, seeding sample data on first run.
  useEffect(() => {
    (async () => {
      const seeded = await storage.isSeeded();
      if (!seeded) {
        const p = buildSeedProfile();
        const m = buildSeedMeals();
        const w = buildSeedWorkouts();
        const wt = buildSeedWeights();
        const c = buildSeedChat();
        await Promise.all([
          storage.setProfile(p),
          storage.setMeals(m),
          storage.setWorkouts(w),
          storage.setWeights(wt),
          storage.setChat(c),
          storage.markSeeded(),
        ]);
        setProfile(p);
        setMeals(m);
        setWorkouts(w);
        setWeights(wt);
        setChat(c);
        setHydrated(true);
        return;
      }
      const [p, m, w, wt, c] = await Promise.all([
        storage.getProfile(),
        storage.getMeals(),
        storage.getWorkouts(),
        storage.getWeights(),
        storage.getChat(),
      ]);
      setProfile(p);
      setMeals(m);
      setWorkouts(w);
      setWeights(wt);
      setChat(c);
      setHydrated(true);
    })();
  }, []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await storage.setProfile(p);
  }, []);

  const addMeal = useCallback(
    async (m: Meal) => {
      const next = [m, ...meals];
      setMeals(next);
      await storage.setMeals(next);
    },
    [meals],
  );

  const deleteMeal = useCallback(
    async (delId: string) => {
      const next = meals.filter((m) => m.id !== delId);
      setMeals(next);
      await storage.setMeals(next);
    },
    [meals],
  );

  const addWorkout = useCallback(
    async (w: Workout) => {
      const next = [w, ...workouts];
      setWorkouts(next);
      await storage.setWorkouts(next);
    },
    [workouts],
  );

  const addWeight = useCallback(
    async (entry: WeightEntry) => {
      // Replace same-day entry if present, then keep sorted by date.
      const filtered = weights.filter((w) => w.date !== entry.date);
      const next = [...filtered, entry].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );
      setWeights(next);
      await storage.setWeights(next);
    },
    [weights],
  );

  const appendChat = useCallback(
    async (msg: ChatMessage) => {
      const next = [...chat, msg];
      setChat(next);
      await storage.setChat(next);
    },
    [chat],
  );

  const resetAll = useCallback(async () => {
    await storage.reset();
    setProfile(null);
    setMeals([]);
    setWorkouts([]);
    setWeights([]);
    setChat([]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      hydrated,
      profile,
      meals,
      workouts,
      weights,
      chat,
      saveProfile,
      addMeal,
      deleteMeal,
      addWorkout,
      addWeight,
      appendChat,
      resetAll,
    }),
    [
      hydrated,
      profile,
      meals,
      workouts,
      weights,
      chat,
      saveProfile,
      addMeal,
      deleteMeal,
      addWorkout,
      addWeight,
      appendChat,
      resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
