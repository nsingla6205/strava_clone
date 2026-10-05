# TurfRun

A Strava-style running app where **your GPS path claims territory** on a shared map. Run through a street to paint it in your color — rivals can steal cells by running through them.

## Features

- Live GPS tracking (plus **Demo mode** for desktop / no GPS)
- Grid-based territory claiming (~55m cells)
- Shared world map of all claimed cells
- Activity history with distance, time, pace, cells claimed
- Leaderboard by territory owned
- Auth with JWT
- **Installable mobile app** (PWA — Add to Home Screen)

## Stack

- **Backend:** Go, Chi, SQLite, JWT
- **Frontend:** React (Vite), React Leaflet, Esri street basemap, PWA

## Quick start

### 1. API

```bash
cd backend
go run ./cmd/server
```

API listens on `http://localhost:8080`.

### 2. Web app

```bash
cd frontend
npm install
npm run dev
```

Open the HTTPS URL Vite prints (e.g. `https://localhost:5173`), create an account, then hit **Go**.

API calls go through the Vite proxy (`/api`), so phones on your Wi‑Fi work without hardcoding `localhost`.

## Host for free (anywhere, no same Wi‑Fi)

Deploy the whole app (API + web + HTTPS) on **[Render](https://render.com)** free tier. Then open the public URL from any phone/network and install the PWA.

### 1. Push this project to GitHub

```bash
cd /Users/nsingla/GolandProjects/strava_clone
git init
git add .
git commit -m "TurfRun: territory running app"
# create a repo on GitHub, then:
git remote add origin https://github.com/<you>/strava_clone.git
git push -u origin main
```

### 2. Deploy on Render

1. Go to [render.com](https://render.com) → Sign up (free) → **New** → **Web Service**
2. Connect the GitHub repo
3. Settings:
   - **Runtime:** Docker
   - **Plan:** Free
   - **Health check path:** `/health`
4. Environment variables (optional — `render.yaml` sets these):
   - `JWT_SECRET` = any long random string
   - `DB_PATH` = `/data/turf.db`
   - `FRONTEND_DIR` = `/app/frontend/dist`
5. Click **Create Web Service** and wait for the build

You’ll get a URL like `https://turfrun-xxxx.onrender.com`.

Open that on your phone → allow location → **Install** / **Add to Home Screen**.

Or use Blueprint: **New** → **Blueprint** → select the repo (uses `render.yaml`).

### Free tier notes

- Spins down after ~15 min idle; first request after that can take ~30–60s
- Disk is ephemeral — SQLite data can reset on redeploy/restart (fine for demos)
- Real HTTPS cert — GPS and PWA install work without same Wi‑Fi or cert warnings

### Local Docker (optional)

```bash
docker build -t turfrun .
docker run --rm -p 8080:8080 -e JWT_SECRET=change-me turfrun
# open http://localhost:8080
```

## Install on your phone (PWA)

### From hosted URL (recommended)

Open your Render URL in mobile Chrome/Safari → Install / Add to Home Screen.

### From your laptop (same Wi‑Fi)

1. Start the API: `cd backend && go run ./cmd/server`
2. Start the app: `cd frontend && npm run dev`
3. On your phone open the HTTPS LAN URL Vite prints (e.g. `https://192.168.1.20:5173`)
4. Accept the self-signed certificate warning → allow location

**Android (Chrome):** tap **Install**, or menu → **Install app**  
**iPhone (Safari):** Share → **Add to Home Screen**

> Indoors / no GPS: use **Demo mode** on the Run screen.

## How territory works

1. Start a run and stream GPS points to the API.
2. Points are mapped onto a lat/lng grid (`0.0005°` ≈ 55m).
3. Each cell you cross becomes yours (or is stolen from another runner).
4. The map paints owned cells in each runner’s color.

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | | Sign up |
| POST | `/api/auth/login` | | Log in |
| GET | `/api/me` | ✓ | Profile + stats |
| POST | `/api/activities` | ✓ | Start run |
| POST | `/api/activities/:id/track` | ✓ | Append GPS points |
| POST | `/api/activities/:id/finish` | ✓ | Finish run |
| GET | `/api/activities` | ✓ | Your history |
| GET | `/api/feed` | | Recent runs |
| GET | `/api/territory` | | Cells in bbox |
| GET | `/api/leaderboard` | | Top territory owners |

## Env

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API port |
| `JWT_SECRET` | dev secret | JWT signing key |
| `DB_PATH` | `data/turf.db` | SQLite file |
| `FRONTEND_DIR` | `../frontend/dist` | Built web app to serve from Go |
| `VITE_API_URL` | `/api` | Frontend API base (override if needed) |
