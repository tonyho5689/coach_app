# Coach — AI Health & Fitness Coach (MVP)

A demoable React Native + Expo (TypeScript) mobile app. **Structured-first**: the
entry point is a data-rich Dashboard, and the AI chatbot ("Advisor") earns its
value by answering from your **real** logged meals, workouts, and weight trend —
not a blank GPT-style chat.

No backend. All data lives on-device via AsyncStorage, and the app ships seeded
with a sample profile plus a few days of meals/workouts so the Dashboard and
Advisor have real data on first open.

## Run it (Expo Go)

```bash
npm install
npm start
```

Then scan the QR code with the **Expo Go** app on your phone (iOS/Android), or
press `i` / `a` for a simulator/emulator.

> First launch seeds the demo data and drops you on the Dashboard. To replay the
> onboarding flow, go to **Profile → Reset all data**.

## Optional: real LLM (Anthropic Claude)

The app works fully without an API key (realistic mocked meal analysis + a
data-aware mocked Advisor). To enable **real** AI vision + chat:

```bash
cp .env.example .env
# then set EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
npm start
```

- **Meals**: a Claude vision call estimates calories/macros from the photo.
- **Advisor**: each question is sent with your profile + recent meals + workouts
  as grounding so answers reference your actual numbers.

Default model is `claude-sonnet-4-6` (override with `EXPO_PUBLIC_ANTHROPIC_MODEL`).

## Features

| Tab | What it does |
| --- | --- |
| **Home** | Today's calories vs target (ring), macros, workouts this week, weight trend, day streak, recent activity. |
| **Meals** | Photograph/pick a meal → estimated calories + protein/carbs/fat + a note vs your goal → saved to a scrollable history. |
| **Workout** | Pick squats or push-ups → live camera with an animated pose-skeleton overlay and a rep counter → form score (0–100) + coach tips → history. |
| **Advisor** | Grounded chat. A visible "What Coach can see right now" panel shows the exact facts (calories left, protein gap, workouts this week, weight trend) fed to the model. |
| **Profile** | View/edit body profile & goals; targets recompute automatically; editing weight logs a weigh-in. |

## Tech notes

- **Expo Router** for the 5-tab navigation + onboarding gate.
- **AsyncStorage** persistence with first-run seeding (`src/seed.ts`).
- **Targets** computed via Mifflin–St Jeor BMR × activity factor, adjusted by goal (`src/nutrition.ts`).
- **LLM layer** (`src/llm.ts`) cleanly swaps between a live Anthropic call and
  deterministic, data-aware mocks.
- Camera via `expo-camera` (workout) and `expo-image-picker` (meals);
  charts/overlays via `react-native-svg`.

## Project structure

```
app/
  _layout.tsx          # root: providers + hydration gate
  index.tsx            # onboarding vs tabs redirect
  onboarding.tsx       # multi-step profile form
  (tabs)/
    _layout.tsx        # bottom tab bar
    index.tsx          # Home dashboard
    meals.tsx          # meal capture + history
    workout.tsx        # camera + pose overlay + rep counter
    advisor.tsx        # grounded chatbot
    profile.tsx        # view/edit profile
src/
  context/AppContext.tsx
  components/           # ui.tsx, charts.tsx, PoseSkeleton.tsx
  llm.ts  nutrition.ts  storage.ts  seed.ts  types.ts  theme.ts
```
