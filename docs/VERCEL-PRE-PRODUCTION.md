# Pre-production (staging) on Vercel

Use a **staging branch** so you have a stable pre-production URL to test before going live.

---

## 1. Create a staging branch

In your repo, create and push a branch (e.g. `staging` or `preview`):

```bash
git checkout -b staging
git push -u origin staging
```

---

## 2. Configure Vercel

1. Open **[Vercel Dashboard](https://vercel.com/dashboard)** → your **music-bingo** project.
2. Go to **Settings** → **Git**.
3. Under **Production Branch**, keep **main** (or whatever you use for production).
4. **Preview deployments** are already on: every push to a non-production branch (and every PR) gets a unique URL like:
   - `music-bingo-git-staging-yourteam.vercel.app`
   - or for a PR: `music-bingo-pr-123-yourteam.vercel.app`

---

## 3. Get a stable pre-production URL

**Option A – Use the branch URL**

- Push to `staging` (or `preview`). Vercel assigns a **fixed URL** for that branch, e.g.:
  - `https://music-bingo-git-staging-kingzandqueenzentertainment-1662s-projects.vercel.app`
- That URL stays the same for every new deploy from `staging`. Use it as your pre-production link.

**Option B – Custom domain (optional)**

- In **Settings** → **Domains**, add a domain like `staging.yourdomain.com`.
- Assign it to the **staging** branch. Now pre-production is always at that domain.

---

## 4. Workflow

| Environment   | Branch  | URL |
|---------------|---------|-----|
| **Production** | `main` | `music-bingo-kingzandqueenzentertainment-1662s-projects.vercel.app` |
| **Pre-production** | `staging` | `music-bingo-git-staging-kingzandqueenzentertainment-1662s-projects.vercel.app` (example) |

- Develop and test on **staging**. When ready, merge **staging** → **main** to release to production.
- Use the same Supabase project for both (or a separate Supabase project for staging if you prefer).

---

## 5. Env vars for staging

- **Settings** → **Environment Variables**: you can set different values per environment.
- For each variable, choose **Preview** (and/or **Production**). Preview = all non-production branches, including staging.
- So staging will use the same or different Supabase (or other) keys as you configure.

---

## Quick start

```bash
git checkout -b staging
git push -u origin staging
```

Then in Vercel → **Deployments**, open the latest deployment for the `staging` branch and copy that URL. That’s your pre-production link.
