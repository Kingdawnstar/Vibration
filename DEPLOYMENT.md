# 🚀 Vibration Guitar Academy - Deployment Guide

This guide details the exact steps to deploy the **Vibration Guitar Academy** full-stack application to **Vercel** and **GitHub Pages**. 

---

## Option A: Full-Stack Deployment on Vercel (Recommended)

Vercel natively supports building both the React static frontend and serving your Express backend serverless routes via our pre-configured `/vercel.json` file.

### Step-by-Step Instructions:
1. Push this repository to your personal **GitHub** account.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New"** -> **"Project"**.
3. Import your GitHub repository.
4. Keep the framework preset on **Vite** (Vercel will auto-detect everything automatically).
5. Open the **"Environment Variables"** dropdown and append these keys:
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key to enable AI-optimized lesson drafts.
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`: *(Optional)* To enable dispatching authentic email newsletters when publication alerts trigger.
6. Click **"Deploy"**. Vercel will build your static files and deploy your `/api` backend as responsive serverless functions under a single domain link!

---

## Option B: Deploying to GitHub Pages (Static Client Only)

GitHub Pages hosts **static content** (SPA files). It does not natively run Node.js/Express. However, we have configured the app to allow the frontend on GitHub Pages to interact seamlessly with your Vercel backend using CORS!

### Step-by-Step Instructions:
1. **Deploy to Vercel first** (follow Option A) to obtain your live API server domain (e.g., `https://vibration-academy.vercel.app`).
2. Update the automated pipeline file in this repository: `/.github/workflows/deploy.yml`:
   - Change `VITE_BASE_PATH` value to fit your exact GitHub repository path (e.g. `"/my-repository-name/"`).
   - Change `VITE_API_BASE` value to point to your live Vercel backend server URL.
3. Make sure GitHub Pages deployment is enabled on your repository's **Settings -> Pages**:
   - Source: **Build and deployment** -> Choose **GitHub Actions**.
4. Push your changes to the `main` or `master` branch. The automated GitHub Action will run in the background, bundle your client build, and publish it straight to `<username>.github.io/<repo-name>`.

---

## Summary of Configuration Support Files Provided:
- **`vercel.json`**: Ensures correct serverless rewriting so `/api/*` logic routes cleanly to our custom Express endpoint on Vercel while serving the SPA correctly.
- **`vite.config.ts`**: Upgraded to support customizable sub-directory paths (`VITE_BASE_PATH`) so assets load perfectly when deployed on nested GitHub Pages URLs.
- **`src/components/AdminPanel.js`**: Upgraded to dynamically target either local relative paths or the remote `VITE_API_BASE` serverless URL safely.
- **`backend/app.ts`**: Exposes the modular routes and implements smart CORS origin handling for cross-origin fetches.
