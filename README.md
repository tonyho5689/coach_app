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

## Web build & Vercel deploy

The app also runs as a responsive web app (React Native Web). Build locally:

```bash
npm run build:web   # outputs a static site to ./dist
npx serve dist      # preview locally
```

**Deploy to Vercel** — the repo is zero-config ready (`vercel.json`):

- **Dashboard (recommended):** Import the GitHub repo at vercel.com. Vercel
  auto-detects `vercel.json` (build `expo export --platform web`, output `dist`,
  SPA rewrites) and deploys on every push.
- **CLI:** `npm i -g vercel && vercel --prod`

No environment variables or API keys are required — see below.

## AI features (MVP: built-in responses)

For this MVP stage, the "AI" features run **fully on-device with hard-coded
responses** — no external LLM/API calls, no keys, no network dependency — so the
demo works anywhere (including the Vercel web build) out of the box.

- **Meals**: tapping analyze returns a realistic built-in calorie/macro estimate
  (with light jitter so repeated captures feel live).
- **Advisor**: replies are computed from your **real** logged data, so they still
  reference your actual numbers (calories left, protein gap, workouts this week,
  weight trend) — see the visible "What Coach can see right now" panel.

All of this lives in `src/llm.ts`, behind the same `analyzeMealImage()` /
`askAdvisor()` functions — so a real LLM can be dropped back in later without
touching the screens.

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
- **AI layer** (`src/llm.ts`) returns deterministic, data-aware built-in
  responses for the MVP (no external API), behind swappable function boundaries.
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
