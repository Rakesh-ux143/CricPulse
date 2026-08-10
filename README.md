# Cricket Scorer — Phase 1

Plain HTML/CSS/JS app, hosted free on GitHub Pages, with Firebase Realtime Database
as the shared live store so the Admin Panel, Live Match page, Scorecard, and the
OBS overlay all stay in sync in real time, from any device.

## 1. Create your Firebase project (5 min, free)
1. Go to https://console.firebase.google.com → **Add project** → name it anything.
2. In the left menu: **Build → Realtime Database → Create Database**.
   - Pick a region close to you.
   - Start in **test mode** for now (open read/write) — see step 3 to lock it down.
3. Go to **Project settings** (gear icon) → scroll to **Your apps** → click the
   web icon `</>` → register an app (no hosting needed) → copy the `firebaseConfig` object.
4. Paste those values into `assets/firebase-config.js` in this project.

### Lock down the database (recommended before going public)
In Realtime Database → **Rules**, replace the test-mode rules with something like:
```json
{
  "rules": {
    "match": {
      ".read": true,
      ".write": true
    }
  }
}
```
This keeps it simple (no login) but scoped to just the `match` node. For real
tournaments, add Firebase Authentication and restrict `.write` to signed-in admins —
that's a good Phase 2 addition.

## 2. Push to GitHub
```bash
cd cricket-scorer
git init
git add .
git commit -m "Cricket scorer phase 1"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 3. Turn on GitHub Pages
Repo → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / root → Save.
Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## 4. Use it
- **Admin Panel** (`admin.html`) — create teams, add players, start the innings, score ball by ball.
- **Live Match** (`live-score.html`) — public scoreboard, share this link with viewers.
- **Scorecard** (`scorecard.html`) — full batting/bowling card.
- **Teams / Players** — read-only squad and stat views.
- **OBS Ticker** (`obs-ticker.html`) — add as an OBS **Browser Source** pointing at
  `https://<your-username>.github.io/<repo-name>/obs-ticker.html`. Background is
  transparent, so it overlays cleanly on your stream. Tick "Shutdown source when
  not visible" off so it keeps syncing.

## Notes on the scoring model
This is a simplified ball-by-ball engine (good enough for club/local matches):
- Wide/no-ball add 1 run and don't count as a legal ball.
- Bye/leg-bye add 1 run, count as a legal ball, don't credit the batsman.
- Strike rotates on odd runs and automatically at the end of each over.
- One match "slot" is stored at a time (`/match` in the database). Starting a new
  match after "Reset Match" clears the old one — export/save history first if you
  want to keep records long-term (good Phase 3 addition: archive completed matches
  under `/matches/{id}` instead of overwriting `/match`).

## Roadmap (from your plan)
- **Phase 2:** four/six/wicket animations, automatic scorecard popup, innings break
  graphics, highlights graphics, TV-style transitions.
- **Phase 3:** automatic statistics, Orange Cap / Purple Cap, advanced overlays,
  semi-automatic updates, plus the remaining Total Pages: Schedule, Points Table, Settings.
