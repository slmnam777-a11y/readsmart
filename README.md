# ReadSmart — Deployment Guide

## What this is
ReadSmart tutor dashboard — Phase 1 (tutor dashboard + learner profiles + session logging + OT flags).
Deployed to: `readsmart.metanoia-learn.com`

## Files in this repo

```
public/
  index.html      — full single-page application
  app.js          — all client-side logic + Supabase calls
netlify/
  functions/
    config.js     — returns Supabase keys (server-side only)
netlify.toml      — Netlify build + redirect config
supabase_migration.sql  — run this in Supabase SQL editor FIRST
```

---

## Step 1 — Run the database migration

1. Go to **supabase.com** → your project (`ptvfbmuqgefncwkzrvxt`)
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `supabase_migration.sql`
5. Paste and click **Run**
6. You should see "Success. No rows returned."

---

## Step 2 — Create a GitHub repo

1. Go to **github.com** → click **+** → **New repository**
2. Name it `readsmart`
3. Set to **Public** (or Private if you prefer)
4. Tick **Add a README file**
5. Click **Create repository**
6. Click **Add file** → **Upload files**
7. Upload the entire folder contents (all files keeping the folder structure)
8. Click **Commit changes**

---

## Step 3 — Create a new Netlify site

1. Go to **netlify.com** → **Add new site** → **Import an existing project**
2. Connect to GitHub → select the `readsmart` repo
3. Build settings (should auto-detect from `netlify.toml`):
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
4. Click **Deploy site**

---

## Step 4 — Add environment variables

In Netlify → your new site → **Site settings** → **Environment variables** → **Add variable**:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://ptvfbmuqgefncwkzrvxt.supabase.co` |
| `SUPABASE_ANON_KEY` | *(your Supabase anon key — find in Supabase → Settings → API)* |

After adding both variables: **Deploys** → **Trigger deploy** → **Deploy site**

---

## Step 5 — Set the custom subdomain

### In Netlify:
1. **Site settings** → **Domain management** → **Add custom domain**
2. Enter: `readsmart.metanoia-learn.com`
3. Click **Verify** → **Add domain**
4. Copy the **CNAME target** Netlify gives you (looks like `random-name.netlify.app`)

### In Namhost (cPanel):
1. Log in to Namhost cPanel
2. Go to **Zone Editor** (or **DNS Manager**)
3. Find the domain `metanoia-learn.com`
4. Add a new record:
   - **Type:** CNAME
   - **Name:** `readsmart`
   - **Value:** *(the Netlify CNAME target from above)*
   - **TTL:** 3600
5. Save

DNS can take 10–60 minutes to propagate.

---

## Step 6 — Create your first tutor account

ReadSmart uses Supabase Auth — you need to create a tutor account in Supabase:

1. Go to Supabase → **Authentication** → **Users** → **Invite user**
2. Enter your email address
3. You'll receive an invite email — click the link to set your password
4. Go to `readsmart.metanoia-learn.com` and sign in

Alternatively, enable **Email signups** in Supabase Auth settings and sign up directly from the login screen.

---

## Adding more tutors

Repeat Step 6 for each tutor. Each tutor can only see their own assigned learners (enforced by Row Level Security).

---

## What's coming in Phase 2

- Diagnostic screener (all 5 domains, scoring engine, OT flags)
- Gate assessments (all 6 gates, pass/hold/remediate decisions)
- Fluency tracker with WCPM charts
- AI tutor integration (Anthropic API)
- Parent portal
