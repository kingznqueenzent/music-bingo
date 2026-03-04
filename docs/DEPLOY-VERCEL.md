# Deploy Music Bingo to Vercel

Follow these steps so your family can use the app at a public URL.

---

## 1. Push the project to GitHub

If the project isn’t in a GitHub repo yet:

1. Create a new repo at [github.com/new](https://github.com/new) (e.g. `music-bingo`).
2. In your project folder, run:

```bash
git init
git add .
git commit -m "Initial commit – Music Bingo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/music-bingo.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 2. Import the repo in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. **Import** your `music-bingo` GitHub repo.
4. Leave **Framework Preset** as Next.js and **Root Directory** as `.`.
5. Before deploying, add environment variables (step 3 below).

---

## 3. Add the same env vars you use locally

In Vercel: **Project → Settings → Environment Variables**. Add these **names** and paste the **values** from your local `.env.local` (same ones you use when running the app):

| Name | Where to get the value |
|------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Copy from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copy from `.env.local` |
| `DATABASE_URL` | Copy from `.env.local` (use the same connection string; for Vercel you can leave the password as-is, including `$` → use `\$` if needed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → **Project Settings → API** → **service_role** (secret). Use this in production so the server can run admin actions. |

- For each variable, choose **Environment**: Production (and optionally Preview if you want).
- Save after adding each one.

---

## 4. Deploy

1. In Vercel, click **Deploy** (or trigger a new deployment from the **Deployments** tab).
2. Wait for the build to finish. Vercel will show a URL like:
   `https://music-bingo-xxxx.vercel.app`

That URL is your app. Share it with your family.

---

## 5. Share a game with your family

1. Open your Vercel URL → **Host a Game** → create a game and copy the **game code**.
2. Send your family the **join link**:
   ```
   https://YOUR-VERCEL-URL.vercel.app/join?code=GAMECODE
   ```
   Replace `YOUR-VERCEL-URL` and `GAMECODE` with your real URL and code.
3. They open the link, enter their name, and get their card.

---

## Troubleshooting

- **Build fails:** Check the build log. Often it’s a TypeScript or lint error; fix it locally and push again.
- **“Missing Supabase env vars”:** Ensure all four variables above are set in Vercel and redeploy.
- **Themes / DB errors in production:** Confirm `DATABASE_URL` is set in Vercel and matches Supabase (same project and password).
