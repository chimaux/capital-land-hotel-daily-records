# Hotel Daily Records

React + TypeScript + Vite frontend (styled with Tailwind CSS), Supabase (Postgres + Auth) backend, free tier throughout.

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Create a Supabase project

1. Go to supabase.com → New project (free tier, no card required).
2. Once it's provisioned, open **Project Settings → API** and copy:
   - **Project URL** → paste into `.env.local` as `VITE_SUPABASE_URL`
   - **anon public** key → paste into `.env.local` as `VITE_SUPABASE_ANON_KEY`

## 3. Run the schema

Open **SQL Editor** in the Supabase dashboard → New query → paste the entire contents of `supabase/schema.sql` → Run.

This creates:
- `profiles`, `department_entries`, `expenses`, `cash_positions`, `day_approvals`, `app_settings`
- Row Level Security policies so a Receptionist can only write to `room`, a Bartender only to `bar`, and so on — enforced by Postgres itself, not just the frontend
- Two password-gated functions (`get_public_daily_summary`, `get_public_expenses`) that are the *only* way the public page reads data — there is no direct table grant to anonymous visitors, so the password is checked on the server for every request, not just in the browser
- A seeded public-page password: **hotel123** (change this — see step 6)

## 4. Create the five staff accounts

Supabase dashboard → **Authentication → Users → Add user** (create with email + password, "Auto-confirm" on) for each of:

- receptionist@yourhotel.com
- bartender@yourhotel.com
- chef@yourhotel.com
- manager@yourhotel.com
- chima@yourhotel.com

Then in **SQL Editor**, link each to their role (replace the UUIDs with the `id` shown next to each user in the Users list):

```sql
insert into profiles (id, role, display_name) values
  ('paste-receptionist-uuid', 'receptionist', 'Front Desk'),
  ('paste-bartender-uuid',    'bartender',    'Bar'),
  ('paste-chef-uuid',         'chef',         'Kitchen'),
  ('paste-manager-uuid',      'manager',      'Manager'),
  ('paste-chima-uuid',        'chima',        'Chima');
```

## 5. Run it

```bash
npm run dev
```

Sign in as any of the five accounts. Room/Bar/Kitchen roles see only their entry form; Manager and Chima see expenses and cash position; Chima alone sees the approval control.

## 6. Change the public page password

The seed password is `hotel123`. To change it, sign in as Manager or Chima and, from the browser console (or wire up a small settings field in the app later), call:

```ts
await supabase.rpc('set_public_password', { new_pw: 'your-new-password' })
```

Or just re-run the seed line at the bottom of `schema.sql` with a new password.

## 7. Deploy

- **Frontend:** push this repo to GitHub, then import it at vercel.com (free tier) or netlify.com (free tier). Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the deploy dashboard — same values as `.env.local`.
- **Backend:** nothing to deploy — Supabase is already hosted.

## Notes

- The "late entry" flag (after 2pm for a prior day) is a frontend-only warning today; if you want it enforced (blocking saves rather than just flagging), that logic can move into a Postgres check constraint or trigger.
- `department_entries`, `expenses`, and `cash_positions` all become read-only once `day_approvals.approved = true` for that date — enforced in the RLS policies, not just disabled inputs.
- Currency is formatted as ₦ (Naira) in `src/types.ts` → `money()`. Change the symbol there if needed.
