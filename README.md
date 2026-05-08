# SnapBite — Phase 1 (Food Tracker)

A Progressive Web App for scanning food, logging meals, and seeing what
exercise burns it off. Vite + React + TypeScript + Tailwind + Dexie.

This is the Phase 1 scaffold of a 3-phase build:

| Phase | Scope | Status |
|---|---|---|
| 1 | Food tracker (search, barcode, log, daily history, exercise estimates) | this repo |
| 2 | Exercise tracking (workouts, Apple Health / Health Connect import) | TODO |
| 3 | Social — friends, groups, feed, challenges (Supabase backend) | TODO |

---

## Quick start

```bash
cd food-tracker
npm install
npm run icons     # one time — generates PWA PNG icons from public/icon.svg
npm run dev       # localhost
# or:
npm run dev:lan   # also exposes on your LAN IP for phone testing
```

Then open the URL Vite prints (`http://localhost:5173`).

### Test on your phone

Two options:

**1. Same WiFi (HTTP — barcode scanner won't work because camera needs HTTPS)**

```bash
npm run dev:lan
ipconfig getifaddr en0     # your Mac's LAN IP
```

Open `http://<that-ip>:5173` on your phone. Search + log work; barcode does not.

**2. HTTPS tunnel (recommended — full feature parity)**

In a separate terminal (either works):

```bash
npm run tunnel              # npx cloudflared → http://127.0.0.1:5173 (pair with npm run dev)
# or, if cloudflared is installed globally:
brew install cloudflared
cloudflared tunnel --url http://localhost:5173
```

For a **production-like** install test (service worker + precache), build then tunnel the preview server:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# other terminal: npx cloudflared tunnel --url http://127.0.0.1:4173
```

Cloudflare prints an `https://*.trycloudflare.com` URL. Open it on your
phone, allow camera, and barcode scanning works. From Safari on iPhone,
Share → "Add to Home Screen" installs it as a real app icon.

---

## Project structure

```
src/
├── App.tsx                  # routes
├── main.tsx                 # entry
├── index.css                # tailwind + a few component classes
├── components/
│   ├── Layout.tsx           # phone-shaped shell with header + outlet
│   ├── TabBar.tsx           # bottom nav with floating "+"
│   ├── BarcodeScanner.tsx   # @zxing/browser wrapper
│   ├── MacroPills.tsx       # protein/carbs/fat bars
│   └── ExerciseList.tsx     # MET-based burn-off rows
├── hooks/
│   └── useProfile.ts        # reactive profile (Dexie)
├── lib/
│   ├── db.ts                # Dexie schema: profile, foods, log
│   ├── api/openfoodfacts.ts # search + barcode lookup, no API key
│   ├── exercises.ts         # MET table + minutesToBurn()
│   ├── format.ts            # macro math + display helpers
│   └── clsx.ts              # tiny className helper
└── pages/
    ├── ScanPage.tsx         # home: scan barcode / search
    ├── SearchPage.tsx       # debounced text search
    ├── FoodDetailPage.tsx   # portion picker → log entry
    ├── HistoryPage.tsx      # today's log + ring chart
    └── ProfilePage.tsx      # weight + goal + reset
```

### Data model

All local — no server in Phase 1.

- `profile` (singleton row id `'me'`): `weightKg`, `goalKcal`
- `foods`: one row per unique product, indexed by `externalId` (barcode)
- `log`: one row per meal eaten, indexed by `dateKey` for fast daily queries

`useLiveQuery` (from `dexie-react-hooks`) makes any UI that reads the DB
update reactively when you write to it. No global state library needed.

---

## What's wired vs TODO

✅ **Working out of the box**
- Text search against OpenFoodFacts (free, no key)
- Barcode scanning (camera + ZXing)
- Local persistence in IndexedDB (offline by default)
- Daily ring + macro stats
- Exercise burn-off estimates using your weight
- Installable PWA (manifest, service worker, runtime cache for OFF API)

🛠️ **Hooks left for you (clearly marked in code)**
- **Photo recognition** — `ScanPage.tsx` "Identify from photo" button.
  The right move is Gemini Vision (free tier). Add `VITE_GEMINI_KEY`
  to `.env.local`, write a `lib/api/gemini.ts` that sends the image and
  asks for a JSON response with name + estimated portion + macros, and
  wire it into a third button on the scanner.
- **Nutritionix** — better unbranded foods (apple, chicken breast, etc.).
  OFF is barcode-strong but unbranded-weak. Add a free key and a tiny
  client in `lib/api/nutritionix.ts`.
- **Manual food** — let users create a food when nothing matches. Just a
  small form that calls `db.foods.add()` with `source: 'manual'`.
- **Charts** — `recharts` is already in deps; build a 7-day calorie chart
  on the History page.

---

## Phase 2 preview (exercise)

Add `exerciseLog` table to `db.ts`, an `ExercisePage` that lets you log a
workout (pick from `EXERCISES`, enter minutes, store kcal burned). The
History ring should subtract burned calories from consumed. On iPhone,
the cleanest path to import Apple Health workouts is a Shortcuts
companion that POSTs JSON to the app via `share-target` — much easier than
trying to talk to HealthKit from a PWA.

## Phase 3 preview (social)

Add Supabase. Tables: `profiles`, `friendships`, `posts`, `groups`,
`group_members`. Auth: magic link or Google. Build a `lib/sync.ts` that
pushes local `log` rows to a `meals` table whenever you're online and
subscribes to friends' inserts via Realtime. Local DB stays the source of
truth; cloud is for sharing.

---

## Common gotchas

- **`npm run icons` fails** — `sharp` needs Xcode CLI tools on a clean Mac.
  `xcode-select --install` and rerun.
- **Barcode scanner says "not allowed"** — camera APIs require HTTPS or
  `localhost`. Use the cloudflared tunnel above when testing on a phone.
- **OFF rate-limits** — be polite. The runtime cache in `vite.config.ts`
  keeps repeat lookups off the network.

---

## License

MIT. Build whatever you want with this.
