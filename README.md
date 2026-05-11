# Metabo.ai — AI-Powered Food & Fitness Tracker

A full-featured iOS app (Capacitor) and Progressive Web App built with Vite + React + TypeScript + Tailwind + Dexie. Track food, exercise, weight, and body composition with an AI companion — all data stored locally on your device.

---

## Features

### Food Logging
- **Barcode scanner** — scan any packaged food using your camera (ZXing); instant nutrition lookup from OpenFoodFacts
- **Text search** — search 300,000+ foods across OpenFoodFacts and the USDA FoodData Central database
- **Manual entry** — create a custom food with name, calories, and macros
- **Indian Food Quick-Add** — one-tap logging for 50+ pre-loaded Indian dishes (South Indian, North Indian, staples, snacks, dals, sweets) organised by category
- **Portion picker** — adjust grams per serving before logging; defaults per food
- **Meal types** — log breakfast, lunch, dinner, or snack; auto-guessed from time of day

### Smart Budget (Today's Dashboard)
- **Time-prorated calorie tracker** — shows how much you "should have eaten" by the current time of day vs. your actual intake; updates every minute
- **Maintenance card** — calories consumed vs. TDEE remaining for the day
- **Goal Budget card** — separate panel (shown when you have a calorie deficit set) tracking goal calories remaining
- **Macro breakdown** — protein, carbs, fat progress pills
- **AI-generated daily insights** — personalised tips based on your log, streak, macros, and exercise

### Exercise Tracking
- **MET-based burn calculator** — log any exercise from a curated list; calories burned calculated from your weight and duration
- **Burn history** — daily exercise log with calorie totals

### Progress & Body Stats
- **XP & level system** — earn XP for every meal and exercise logged; level up with a title (Beginner → Elite Athlete)
- **Food & exercise streaks** — daily streak counters
- **Body stats** — BMR (Mifflin-St Jeor), TDEE, estimated body fat % (Deurenberg)
- **Weight history chart** — 30-day line chart with goal weight reference line
- **12-week weight projection** — forecast based on your calorie goal vs. TDEE
- **Weight logging** — log today's weight with an optional note

### AI Companion
- **Claude-powered chat** — bring your own Anthropic API key; the AI knows your profile, today's log, macros, and exercise so it can give context-aware advice
- **Persistent chat history** — conversations stored locally per day

### Onboarding
- **3-step setup wizard** — collects weight, height, age, sex → activity level → goal type (lose / maintain / gain) on first launch
- **Auto-calculated targets** — calorie goal and protein goal set automatically from your TDEE and goal type

### Profile & Settings
- **Body profile** — update weight, height, age, sex, activity level at any time
- **Goal management** — switch between lose / maintain / build; adjust daily calorie and protein targets; set a goal weight
- **AI key management** — store your Anthropic API key locally (never sent to any server)
- **Data controls** — erase all logged data from the device

### Date Navigation
- **Browse any past day** — tap arrows in the header to view history, macros, and exercise for any previous date

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Local database | Dexie (IndexedDB) + `dexie-react-hooks` |
| Auth | Supabase (auth only; all data stays local) |
| Native app | Capacitor (iOS + Android) |
| Barcode scanning | ZXing (`@zxing/browser`) |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Food databases | OpenFoodFacts API, USDA FoodData Central API |
| AI | Anthropic Claude (user-supplied key, called client-side) |

---

## Data Model

All data is stored **locally on the device** in IndexedDB via Dexie. Nothing is sent to any server (except Supabase for authentication and Claude for AI chat when you supply an API key).

| Table | Description |
|---|---|
| `profile` | Singleton row (`id: 'me'`) — weight, height, age, sex, activity, goals, API key |
| `foods` | One row per unique food; indexed by `externalId` (barcode / USDA id / manual) |
| `log` | One row per logged meal; indexed by `dateKey` for fast daily queries |
| `exerciseLog` | One row per exercise session; `exerciseId`, duration, kcal burned |
| `weightLog` | Daily weight entries with optional notes |
| `recoveryLog` | Sleep hours, sleep quality, stress, soreness (1–5 scales) |
| `chatLog` | AI chat messages; indexed by `dateKey` and `msgId` |

### Food Sources
Foods can originate from: `off` (OpenFoodFacts), `usda` (USDA), `manual` (user-created), `indian` (built-in Indian food library), `gemini` (AI photo recognition), `ai` (AI chat suggestion).

---

## Project Structure

```
src/
├── App.tsx                      # routes + auth guards + onboarding gate
├── main.tsx                     # entry
├── index.css                    # Tailwind + component utility classes
├── context/
│   ├── AuthContext.tsx           # Supabase auth state
│   └── DateContext.tsx           # selected date shared across pages
├── hooks/
│   └── useProfile.ts            # reactive profile from Dexie
├── components/
│   ├── Layout.tsx               # app shell: header, date picker, outlet
│   ├── TabBar.tsx               # bottom nav (History, Scan, Exercise, Progress, Profile)
│   ├── BarcodeScanner.tsx       # ZXing camera overlay
│   ├── MacroPills.tsx           # protein / carbs / fat progress bars
│   └── ExerciseList.tsx         # MET exercise picker list
├── lib/
│   ├── db.ts                    # Dexie schema, all DB helpers
│   ├── bodySimulation.ts        # BMR, TDEE, body fat, weight projection, XP/levels
│   ├── exercises.ts             # MET table + burn calculator
│   ├── indianFoods.ts           # 50+ pre-loaded Indian foods
│   ├── insights.ts              # rule-based daily insight generator
│   ├── aiChat.ts                # Claude API client
│   ├── format.ts                # macro math + display helpers
│   ├── supabase.ts              # Supabase client
│   └── api/
│       ├── openfoodfacts.ts     # OpenFoodFacts search + barcode lookup
│       └── usda.ts              # USDA FoodData Central search
└── pages/
    ├── AuthPage.tsx             # sign in / sign up
    ├── OnboardingPage.tsx       # 3-step first-launch wizard
    ├── HistoryPage.tsx          # today's log, Smart Budget, macros, insights
    ├── ScanPage.tsx             # barcode scan, food search, Indian quick-add
    ├── SearchPage.tsx           # debounced multi-source food search
    ├── FoodDetailPage.tsx       # portion picker → log entry
    ├── ManualEntryPage.tsx      # create a custom food
    ├── ExercisePage.tsx         # log exercise, view burn history
    ├── ProgressPage.tsx         # XP, streaks, body stats, weight chart, projection
    ├── ProfilePage.tsx          # body profile, goals, AI key, account, data
    └── AIChatPage.tsx           # Claude AI chat companion
```

---

## Quick Start (Web)

```bash
npm install
npm run dev          # localhost:5173
npm run dev:lan      # also exposes on LAN IP for phone testing
```

### HTTPS tunnel (required for barcode scanner on phone)

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npx cloudflared tunnel --url http://127.0.0.1:4173
```

Open the `https://*.trycloudflare.com` URL on iPhone → Share → Add to Home Screen.

---

## iOS / Android (Capacitor)

```bash
npm run build
npx cap sync ios
# open ios/App/App.xcodeproj in Xcode and run on device
```

---

## Environment

No `.env` file is required for the food databases — OpenFoodFacts and USDA are free with no key. Supabase credentials are baked into `src/lib/supabase.ts`. The Anthropic API key is entered by the user in the Profile tab and stored locally on the device.

---

## License

MIT
