# Player login setup (Supabase + Google)

The code is ready. These steps connect it to **your** accounts. Until step 6 is
done, the site works exactly as before and the login link stays hidden.

Total time: about 20 minutes. Everything here is free.

## 1. Create the Supabase project

1. Sign up at https://supabase.com (you can use your Google account).
2. **New project** → name `aji-tl3ab`, choose a strong database password (save it
   somewhere safe), region **closest to Morocco** (e.g. a Western Europe region).
3. Wait ~2 minutes for the project to be ready.

## 2. Create the profiles table

1. In Supabase: **SQL Editor** → **New query**.
2. Paste the whole content of `supabase/migrations/0001_profiles.sql` from this repo.
3. Click **Run**. You should see "Success. No rows returned".

This creates the `profiles` table with the privacy rules: each player can only
read and edit their own row. You see everyone in **Table Editor → profiles**.

Then do the same with `supabase/migrations/0002_training.sql` (prépa physique
sign-ups) and `supabase/migrations/0003_community.sql` (online bookings,
waiting list, votes, leaderboard, monthly draw, referrals). Run the files
**in number order**; each one is safe to run again. See `docs/ADMIN.md` for
day-to-day admin.
You see who signed up for each session in **Table Editor → training_signups**.

## 3. Create the Google login credentials

1. Go to https://console.cloud.google.com → create a project named `AJI TL3AB`.
2. **APIs & Services → OAuth consent screen** (may be called "Google Auth Platform"):
   - User type: **External**
   - App name: `AJI TL3AB`, support email: your email
   - Scopes: keep the defaults (email, profile, openid) — nothing else
3. **Publish the app** (Audience / Publishing status → **Publish app**).
   ⚠️ If you skip this, only test users you add by hand can log in.
4. **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URI**: copy it from Supabase → **Authentication →
     Sign In / Providers → Google** ("Callback URL", it looks like
     `https://<your-project>.supabase.co/auth/v1/callback`)
5. Copy the **Client ID** and **Client secret**.

## 4. Turn on Google in Supabase

Supabase → **Authentication → Sign In / Providers → Google** → enable, paste the
Client ID and Client secret → **Save**.

## 5. Tell Supabase where the site lives

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://aji-tl3ab.vercel.app`
- **Redirect URLs** → add: `https://aji-tl3ab.vercel.app/auth/callback`

(Add your own domain here too if you connect one later.)

## 6. Give the keys to Vercel

1. Supabase → **Project Settings → API Keys**: copy the **Project URL** and the
   **publishable key** (starts with `sb_publishable_`; older projects call it the
   "anon public" key — either works).
   ⚠️ Never copy the **secret** / **service_role** key anywhere.
2. Vercel → your project → **Settings → Environment Variables**, add for
   **Production** (and Preview if you want):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |

3. **Deployments** → latest → **⋯ → Redeploy** (env vars only apply to new builds).

## 7. Test

1. Open the site → **Connexion** appears in the navbar.
2. **Continuer avec Google** → choose your account → you land on **Mon compte**.
3. Fill in name, phone, position, tick the consent box → **Créer mon profil**.
4. In Supabase → **Table Editor → profiles**, your row is there.

## Before going public

- Fill in the legal entity at the top of `app/confidentialite/page.tsx`.
- Check with a local advisor whether you need to declare the processing of
  personal data to the **CNDP** (law 09-08).

## Login by e-mail (magic link)

The Connexion page also lets players log in with just their e-mail: Supabase
sends them a one-time link (no password).

Supabase's built-in e-mail sender only delivers to **members of your Supabase
team** and only a few e-mails per hour. Until you connect your own sender,
other players see "La connexion par e-mail n'est pas encore disponible.
Utilise Google en attendant" — nothing breaks.

To open it to everyone (once you have your professional address/domain):

1. Create an account with an e-mail sending service (e.g. Resend, Brevo —
   both have free plans) and verify your domain there.
2. Supabase → **Authentication → Emails → SMTP Settings** → enable custom
   SMTP, paste the host, port, user and password from that service, and set
   the sender (e.g. `contact@<your domain>`, name `AJI TL3AB`).
3. Optional: **Authentication → Emails → Templates → Magic Link**, write the
   e-mail in French.
