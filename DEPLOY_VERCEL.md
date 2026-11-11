# OrbitOS — Vercel Deployment Guide

This guide walks you through deploying **OrbitOS** on **Vercel** with full 3D WebGL support, interactive flight scenarios, and real-time mission telemetry.

---

## Architecture Overview

| Component | Platform | Role |
| :--- | :--- | :--- |
| **Frontend Cockpit** | **Vercel** (Edge CDN) | React 18, Three.js 3D Earth, Orbital Canvas, Scenario Controls, Telemetry Dashboard |
| **Backend Engine** *(Optional)* | **Render / Railway / VPS** | Python FastAPI, Astrodynamics Engine, Alembic SQLite DB, Live WebSockets (`/ws/v1/simulation`) |

> **Autonomous Standalone Mode:**  
> OrbitOS features a built-in client-side astrodynamic simulation ticker. Even without a connected backend, the 3D globe, orbital paths, and all 3 automated flight scenarios (Nominal Launch, Debris Strike, Satellite Collision) work interactively right in the browser on Vercel!

---

## Method 1: Deploy via Vercel Web Dashboard (Recommended)

1. **Push your code to GitHub**:
   Make sure your latest commits are pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure Vercel deployment with root vercel.json and standalone demo mode"
   git push origin main
   ```

2. **Import into Vercel**:
   - Navigate to [https://vercel.com/new](https://vercel.com/new).
   - Log in with GitHub and click **"Import"** next to `OrbitOs`.

3. **Configure Project Settings**:
   The repository already includes root `vercel.json` and `package.json`, so Vercel detects everything automatically:
   - **Framework Preset**: `Vite` (or `Other`)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (or `npm run build --prefix frontend`)
   - **Output Directory**: `frontend/dist`

4. *(Optional)* **Environment Variables**:
   If you have deployed the FastAPI backend on Render or Railway, expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://your-orbitos-backend.onrender.com`
   - `VITE_WS_URL`: `wss://your-orbitos-backend.onrender.com/ws/v1/simulation`

5. **Click "Deploy"**:
   - Vercel will install dependencies, compile TypeScript, bundle Vite assets, and provide you with a live `https://orbitos-xxx.vercel.app` URL within ~60 seconds!

---

## Method 2: Deploy via Vercel CLI (Terminal)

You can deploy directly from your Linux workstation using the pre-installed `npx`:

1. **Log in and link to Vercel**:
   ```bash
   npx vercel
   ```
   Follow the interactive prompts:
   - *Set up and deploy?* **Y**
   - *Which scope?* (Select your Vercel account)
   - *Link to existing project?* **N**
   - *Project name?* `orbitos`
   - *In which directory is your code located?* `./`
   - *Want to modify these settings?* **N** (Vercel will use `vercel.json`)

2. **Deploy directly to Production**:
   ```bash
   npx vercel --prod
   ```

---

## Connecting the Python Backend (Optional)

If you want live server-side SQLite persistence, AI/ML inference, and 24/7 background telemetry streaming:

### Deploy Backend to Render (Free / Starter)
1. Go to [https://dashboard.render.com](https://dashboard.render.com) -> **New Web Service**.
2. Connect your `OrbitOs` repository.
3. Configure:
   - **Environment**: `Python 3` (or `Docker` using `docker/backend.Dockerfile`)
   - **Build Command**: `pip install -r backend/requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 10000`
4. Copy the resulting URL (e.g. `https://orbitos-api.onrender.com`).
5. In your Vercel Project Settings -> **Environment Variables**, add:
   - `VITE_API_URL` = `https://orbitos-api.onrender.com`
   - `VITE_WS_URL` = `wss://orbitos-api.onrender.com/ws/v1/simulation`
6. Trigger a redeploy on Vercel.

---

## Verification Checklist

- [x] Root `vercel.json` configured with SPA rewrites (`/(.*)` -> `/index.html`)
- [x] Root `package.json` build script targets `frontend/dist`
- [x] `frontend/vercel.json` included for subfolder root configuration
- [x] Initial default satellites rendered on initial load
- [x] Standalone client ticker for offline/demo operation on Vercel
- [x] Three automated flight scenarios playable directly in browser

