# ATLAS — Step-by-Step Deployment Guide

This walks you through putting ATLAS online for free so you can use it from any
device. You'll deploy the app to **Vercel** and the database to **Turso** (hosted,
SQLite-compatible). Everything here is one-time.

- **Time:** ~20–30 minutes.
- **Cost:** ₹0 (both free tiers are ample for one user).
- **You'll need:** a web browser, and the accounts created in Part 0.
- **Commands** are for **Windows PowerShell**, run from the project folder
  `D:\code\PersonalFinanceTracker`. If `node`, `npm`, or `git` "isn't recognized",
  open a **new** PowerShell window (so it picks up the installed PATH) and retry.

> **How the pieces fit:** Vercel runs the app and rebuilds automatically whenever you
> push to GitHub. The app talks to your Turso database over the internet. Your
> secrets live in Vercel's settings and your local `.env` — never in the repo.

---

## Part 0 — Create your accounts (5 min)

Sign up for these (all free; "Continue with GitHub" is the easiest option for Vercel):

1. **GitHub** — https://github.com/signup
2. **Turso** — https://turso.tech (click *Sign up*)
3. **Vercel** — https://vercel.com/signup (choose *Continue with GitHub*)

Keep all three browser tabs open.

---

## Part 1 — Final local check (2 min)

Make sure the app builds cleanly before deploying.

```powershell
npm install
npm run build
```

Expected: it ends with the route list and no red errors. If the build fails, stop
and fix that first — a broken build won't deploy.

---

## Part 2 — Put the code on GitHub (5 min)

### 2a. Create the repository on GitHub
1. Go to https://github.com/new
2. **Repository name:** `atlas` (anything is fine).
3. **Visibility:** **Private** (recommended — it's your personal finance app).
4. Do **not** add a README, .gitignore, or license (the project already has them).
5. Click **Create repository**. Leave that page open — you'll need the URL it shows.

### 2b. Push your code
In PowerShell, from the project folder:

```powershell
git init
git add .
git status
```

Look at the `git status` output and **confirm `.env` and `prisma/dev.db` are NOT
listed** (they're gitignored — your secrets and local data must not be uploaded).
If you see `.env` listed, stop and tell me before continuing.

Then commit and push (replace `<you>` with your GitHub username):

```powershell
git commit -m "ATLAS v1"
git branch -M main
git remote add origin https://github.com/<you>/atlas.git
git push -u origin main
```

If Git asks you to sign in, follow the browser prompt. Expected: your files appear
on the GitHub repo page after a refresh.

---

## Part 3 — Create the Turso database (5 min)

### 3a. Create the database
1. In the Turso dashboard, click **Create Database** (or **+**).
2. Name it `atlas`. Pick the region closest to you (e.g. an India/Asia region).
3. Create it.

### 3b. Get the connection URL and a token
On the database's page:
1. Copy the **Database URL** — it looks like `libsql://atlas-<yourorg>.turso.io`.
   Save it somewhere temporary.
2. Find **Create Token** (sometimes under *"..."*, *Tokens*, or *Connect*). Generate
   a token and copy it. It's a long string — save it too. **This token is a
   password; keep it private.**

### 3c. Create the tables
The project includes a ready-made schema script at
[`prisma/turso-schema.sql`](prisma/turso-schema.sql).

**Easiest (no extra tools) — the dashboard SQL console:**
1. On your Turso database page, open the **SQL console** (also called *Shell*,
   *Query*, or *Edit data → SQL*).
2. Open `prisma/turso-schema.sql` in a text editor, select **all** of it, copy.
3. Paste into the console and **Run**. Expected: it creates the tables with no
   errors. (If your console runs one statement at a time, paste the whole file —
   most consoles accept multiple `;`-separated statements.)

**Alternative — Turso CLI** (if you have it installed):
```powershell
turso db shell atlas < prisma/turso-schema.sql
```

To confirm it worked, run in the console:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```
You should see `User`, `CategoryGroup`, `Category`, `Transaction`,
`RecurringTransaction`, `Budget`, `Person`, `PersonLedgerEntry`, `Fund`.

---

## Part 4 — Generate your auth secret (1 min)

This signs your login session cookie. Generate a random one:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output (a random string). Save it as your `AUTH_SECRET`.

---

## Part 5 — Create your production login + starter data (3 min)

Run the seed **once, pointed at Turso**, to create your account (email + hashed
password) and the default category groups. In PowerShell, from the project folder,
paste this — **filling in your four values** first:

```powershell
$env:DATABASE_URL     = "libsql://atlas-<yourorg>.turso.io"
$env:TURSO_AUTH_TOKEN = "<the token from step 3b>"
$env:ADMIN_EMAIL      = "you@example.com"
$env:ADMIN_PASSWORD   = "<choose a strong password>"
npm run db:seed
```

Expected output: `✔ user: you@example.com` followed by the seeded groups. That email
and password are what you'll log in with on the live site.

> These `$env:` values only apply to this one PowerShell window and are **not**
> saved — that's intentional. Your local `.env` (for local dev) is untouched.

---

## Part 6 — Deploy on Vercel (5 min)

### 6a. Import the repo
1. In Vercel, click **Add New… → Project**.
2. Under **Import Git Repository**, find your `atlas` repo and click **Import**.
   (If you don't see it, click *Adjust GitHub App Permissions* and grant access.)
3. Vercel auto-detects **Next.js** — leave build settings at their defaults.

### 6b. Add environment variables
Before clicking Deploy, expand **Environment Variables** and add these three
(Name → Value). Apply them to **all environments** (Production/Preview/Development):

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://atlas-<yourorg>.turso.io` |
| `TURSO_AUTH_TOKEN` | the token from step 3b |
| `AUTH_SECRET` | the string from Part 4 |

(You do **not** need `DATABASE_URL`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` on Vercel —
those were only for the local seed.)

### 6c. Deploy
Click **Deploy** and wait for the build (~1–2 min). Expected: a success screen with
a link like `https://atlas-<something>.vercel.app`.

---

## Part 7 — Verify (2 min)

1. Open your `https://atlas-….vercel.app` URL — you should land on the **login** page.
2. Sign in with the email/password from **Part 5**.
3. You should reach the dashboard. Add a test transaction on **Expenses**, reload —
   it should persist (that confirms Turso is connected).
4. Open the same URL on your **phone** and sign in there too.

🎉 That's it — ATLAS is live.

---

## Troubleshooting

- **Login says "Invalid email or password"** → the account wasn't seeded, or you're
  using different credentials. Re-run **Part 5** (check for typos in the email).
- **App loads but errors on data / "no such table"** → the schema wasn't applied to
  Turso. Redo **Part 3c** and confirm with the `sqlite_master` query.
- **500 error / "TURSO_DATABASE_URL is undefined"-type errors** → an env var is
  missing or misspelled in Vercel. Check **Part 6b**, then **Redeploy** (Vercel →
  Deployments → ⋯ → Redeploy) — env-var changes need a redeploy to take effect.
- **Build fails on Vercel with a Prisma error** → make sure you pushed the whole repo
  (Part 2); `package.json` already runs `prisma generate` on install.
- **`git push` rejected / auth loop** → sign in via the browser popup, or use a
  GitHub Personal Access Token as the password.
- **`node`/`git` not recognized** → open a fresh PowerShell window and retry.

---

## Updating the app later

Any time you change the code:

```powershell
git add .
git commit -m "describe your change"
git push
```

Vercel automatically rebuilds and redeploys within a minute or two.

**If you change the database schema** (`prisma/schema.prisma`):
1. Locally: `npm run db:migrate` (updates your local dev DB), then restart `npm run dev`.
2. Regenerate the Turso script and apply the change to Turso:
   ```powershell
   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/turso-schema.sql
   ```
   For a brand-new table/column, run the relevant new SQL in the Turso console. (For
   destructive changes, back up first.)
3. Commit and push.

---

## Security notes

- Keep your **Turso token** and **AUTH_SECRET** private — never commit them or share
  screenshots showing them. If a token leaks, revoke it in Turso and create a new one.
- Use a **strong, unique password** for your ATLAS login (Part 5).
- The password `atlas-dev-1234` in the local `.env` is for local development only and
  has nothing to do with your live site.
- Your GitHub repo should stay **private**.
