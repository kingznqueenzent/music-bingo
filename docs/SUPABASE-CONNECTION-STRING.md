# Where to Find the Supabase Connection String

## Option 1: Connect button (fastest)

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)** and open your project.
2. On the **project overview** (home for the project), look at the **top** of the main content area for a **"Connect"** button (or a **"Connect to your database"** / connection card).
3. Click **Connect**.
4. A panel or modal opens with connection options. You’ll see:
   - **Direct connection** – host like `db.xxxxx.supabase.co` (this one often gives ENOTFOUND on some networks).
   - **Session mode** (pooler) – host like `aws-0-us-east-1.pooler.supabase.com`, port **5432**.
   - **Transaction mode** (pooler) – often port **6543**.
5. Choose **Session** (or **Session mode**).
6. Copy the **URI** shown (it looks like  
   `postgresql://postgres.xxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`).
7. Replace `[YOUR-PASSWORD]` with your real database password and put the result in `.env.local` as `DATABASE_URL=...`.

---

## Option 2: Database → Configuration

1. In the **left sidebar**, click **Database**.
2. In the **Database** submenu, click **Configuration** (or **Settings**).
3. Scroll until you see **Connection string** or **Connection pooling**.
4. You should see tabs or options for **Session** and **Transaction**.
5. Open **Session** and copy the URI. It should use a host like `aws-0-REGION.pooler.supabase.com` (not `db.xxx.supabase.co`).
6. Put that full URI (with your password) in `.env.local` as `DATABASE_URL=...`.

---

## What the Session URI looks like

```text
postgresql://postgres.dmcjpkrdivafkqoovyvn:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

- `postgres.dmcjpkrdivafkqoovyvn` = role + project ref  
- `YOUR_PASSWORD` = your database password  
- `aws-0-us-east-1.pooler.supabase.com` = pooler host (your region may differ, e.g. `eu-west-1`)  
- `5432` = port for Session mode  

Use this **Session** (pooler) URI in `DATABASE_URL` so the app can resolve the host and load themes.

---

## Direct link (opens Connect for your project)

If you’re already in the right project, you can open the connection dialog with:

**Session mode:**  
[https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/settings/database?showConnect=true&method=session](https://supabase.com/dashboard/project/dmcjpkrdivafkqoovyvn/settings/database?showConnect=true&method=session)

(Replace `dmcjpkrdivafkqoovyvn` with your project ref if different.)

---

## "password authentication failed for user postgres"

That usually means the **username** in your URI is wrong. Supabase pooler expects:

- **Username:** `postgres.PROJECT_REF` (e.g. `postgres.dmcjpkrdivafkqoovyvn`)
- **Not:** `postgres` alone

So the start of your URI must look like:

```text
postgresql://postgres.dmcjpkrdivafkqoovyvn:YOUR_PASSWORD@...
```

**Do this:**

1. In Supabase, go to **Database** → **Configuration** (or **Settings**) → **Connection string**.
2. Open **Session** and click to **copy the full URI** (do not type it by hand).
3. In the copied string, only **replace** the part that says `[YOUR-PASSWORD]` (or the placeholder) with your actual database password. Do not change `postgres.dmcjpkrdivafkqoovyvn` or the host.
4. Paste that whole string into `.env.local` as `DATABASE_URL=...`, save, and restart the app.
