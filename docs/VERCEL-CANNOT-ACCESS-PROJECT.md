# Can't Get Into the Project – Fix

You see deployments (Ready / Building / Error) but **can't open the project** to change settings. Use these steps.

---

## 1. Open the project directly (bypass the broken path)

Try these URLs **after you're logged in** at [vercel.com](https://vercel.com):

| What | URL to try |
|------|------------|
| **Dashboard (all projects)** | https://vercel.com/dashboard |
| **Team overview** | https://vercel.com/kingzandqueenzentertainment-1662s-projects |
| **Project: music-bingo** | https://vercel.com/kingzandqueenzentertainment-1662s-projects/music-bingo |
| **Project deployments** | https://vercel.com/kingzandqueenzentertainment-1662s-projects/music-bingo/deployments |
| **Project settings** | https://vercel.com/kingzandqueenzentertainment-1662s-projects/music-bingo/settings |

If your project has a **different name** (e.g. random like `music-bingo-abc12xy`), use the **Dashboard** and click the project from the list.

**How to get there:**
1. Go to **https://vercel.com** and **log in** (e.g. **Continue with GitHub**).
2. Click **Dashboard** (or your team name in the top bar).
3. You should see **project cards**. Click the one for **music-bingo** (or the app you deployed).
4. You’re now inside the project. Use the top tabs: **Overview**, **Deployments**, **Settings**.

---

## 2. If you're stuck on the Login page

- Use **Continue with GitHub** (same GitHub account that owns **kingznqueenzent/music-bingo**).
- If your org uses **SAML SSO**, click **Continue with SAML SSO** and sign in with the account that has access to **kingzandqueenzentertainment-1662s-projects**.
- Try a **private/incognito** window and log in again.
- Make sure you're not on a different Vercel account (e.g. personal vs team).

---

## 3. Trigger a new deployment without opening Settings

If you still can’t open the project but have **one Ready deployment**:

- Use the **Visit** link on that Ready deployment. That’s your live app URL.

To get a **new** deployment without clicking inside the project:

**Option A – Deploy from “Add New Project”**
1. Go to **https://vercel.com/new**.
2. Under **Import Git Repository**, select **kingznqueenzent/music-bingo**.
3. If it says “Project already exists”, choose **Add to existing project** and pick **music-bingo** (or your project name). Then click **Deploy**.
4. If it creates a new project, add your **Environment Variables** in the deploy flow (or after in that project’s Settings), then deploy.

**Option B – Deploy from GitHub**
1. Open **https://github.com/kingznqueenzent/music-bingo**.
2. Make a tiny change (e.g. add a space in `README.md`), commit, and push to **main**.
3. If Vercel is connected to this repo, it will auto-deploy. Check the **Deployments** tab in Vercel after a minute.

---

## 4. Fix “Error” deployments when you can’t open the project

If the only deployments are **Error** and you can’t get into the project:

1. Go to **https://vercel.com/dashboard**.
2. Click your **team** → click the **music-bingo** (or your project) **card**.
3. Click the **Deployments** tab.
4. Click the **failed (red)** deployment row.
5. On the deployment page, scroll to **Build Logs** and read the **last error line** (often “Missing env var” or “Build failed”).
6. To add env vars without using Settings: go to **https://vercel.com/kingzandqueenzentertainment-1662s-projects/music-bingo/settings/environment-variables** and add the 4 variables (see VERCEL-ENV-VARS.md). Then **Redeploy** from the Deployments tab.

If **Settings** or **environment-variables** still don’t load, use **Option A** in section 3: **Add New Project** → import **kingznqueenzent/music-bingo** again. When asked, add the 4 env vars in the deploy wizard, then deploy. That gives you a new project with a working deployment; you can use that URL and later delete or ignore the old project.

---

## 5. Quick checklist

- [ ] Logged in at vercel.com (GitHub or SAML).
- [ ] Opened https://vercel.com/dashboard and see my projects.
- [ ] Clicked the **music-bingo** project card (not a deployment URL with `~/`).
- [ ] I’m on the project page with tabs: Overview, Deployments, Settings.
- [ ] From **Deployments**: either clicked **Visit** on a Ready deployment, or **Redeploy**, or triggered a new deploy from **vercel.com/new** with the same repo.

If you’re still blocked, say whether: (1) you never see the project in the dashboard, or (2) you see it but the link doesn’t open, or (3) you’re stuck on the login page. Then we can narrow it down.
