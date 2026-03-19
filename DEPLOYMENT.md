# Deployment Guide: ModernNewsPlatform

This guide explains how to deploy the ModernNewsPlatform to **Railway** (Backend/Database) and **Vercel** (Frontend).

## Option A: Unified Deployment (Fastest)
Deploy everything (Backend + Frontend) as a single service on Railway.

1. **Create a Railway Project**: Select "Deploy from GitHub Repo".
2. **Add PostgreSQL**: Go to `+ New` -> `Database` -> `PostgreSQL`.
3. **Set Environment Variables**: In your Railway Service `Variables` tab:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Automatic)
   - `NEWS_API_KEY`: (Optional) Your GNews API Key.
   - `SESSION_SECRET`: Any random string.
4. **Deploy**: Railway will use the `railway.json` and `package.json` to build and serve the app.

---

## Option B: Split Deployment (Recommended for Performance)
UI on Vercel + API/Database on Railway.

### 1. Backend (Railway)
1. Follow Option A but **don't** worry about the UI port.
2. Note your Railway public URL (e.g., `https://api.railway.app`).
3. Add `CORS_ORIGIN`: `https://your-app.vercel.app` to your Railway variables.

### 2. Frontend (Vercel)
1. **Create a Vercel Project**: Link your GitHub repo.
2. **Set Build Settings**:
   - Framework: `Vite`
   - Build Command: `vite build`
   - Output Directory: `dist/public`
3. **Set Environment Variables**:
   - `VITE_API_BASE_URL`: `https://your-backend-railway-url.app`
4. **Deploy**: Vercel will build the UI and connect it to your Railway API.

## Environment Variable Reference

| Name | Source | Description |
|------|--------|-------------|
| `DATABASE_URL` | Railway | Postgres Connection String |
| `SESSION_SECRET` | Both | Random secret key |
| `VITE_API_BASE_URL` | Vercel | The URL of your Railway API |
| `CORS_ORIGIN` | Railway | The URL of your Vercel deployment |
| `NEWS_API_KEY` | Railway | (Optional) Discovery API key |

## Troubleshooting
- **Database Errors**: Ensure `npm run db:push` has run to sync the schema.
- **CORS Errors**: Check that `CORS_ORIGIN` matches your Vercel URL exactly.
