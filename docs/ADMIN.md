# AJI TL3AB — admin guide

Day-to-day tasks in **Supabase → Table Editor** (no code). Matches themselves
are still managed in the Google Sheet.

## Spots: the one rule

A match's spots taken = the sheet's `reservees` **+** online bookings.

- Booked on **WhatsApp** (guests, people without an account) → add them to
  `reservees` in the sheet, as before.
- Booked **on the site** → counted automatically. **Don't** add them to the
  sheet, or they're counted twice.

⚠️ Don't change a match's **date, time or pitch name** in the sheet once
people have booked it online: those three make up the match's id, so its
online bookings would no longer be attached to it. Cancel it and create a new
row instead.

## After each match (same evening if possible)

Table **bookings** → filter `match_id` (e.g. `2026-11-07-20:00-urbanfoot`):

| Column | What to do |
|---|---|
| `attended` | Untick players who **didn't show up**. They then can't vote, aren't votable, and the match doesn't count for them (leaderboard, badges, draw). |
| `goals` | Type each player's goals. |

`player_name` shows who each row is. Voting opens 1 h after kick-off for
players who were there and closes 48 h after the match; the awards and
"Partager" cards appear on the home page after that.

## Waiting list

When a player cancels, the first people on the waiting list are **booked
automatically**. The site shows them "✓ Tu joues · via la liste d'attente",
but it can't text them — send them a WhatsApp:

Table **waitlist** → filter `promoted_at` *is not null* (sorted newest first).
Their phone number is in **profiles** (search by `player_name`).

## Monthly draw (1st of each month)

**SQL Editor** → run, with the first day of the month you're drawing:

```sql
select * from public.run_monthly_draw('2026-11-01');
```

It picks a random winner among players who played that month (1 ticket each,
+1 per referred friend who also played). Running it again returns the same
winner — it never re-draws. The winner's short name appears on the site;
find their phone in **draws** (`winner_id`) → **profiles**, and message them.

Check the entries before drawing (optional):

```sql
select p.full_name, e.tickets
from public.draw_entries('2026-11-01') e join public.profiles p on p.id = e.user_id
order by e.tickets desc;
```

## Useful views

- **profiles**: every player, phone, position, `referred_by` (who invited them).
- **training_signups**: who signed up for each prépa physique session.
- **votes**: raw votes (`voter_id` → `candidate_id`). Votes are anonymous on
  the site; please keep them that way.

## Team names on results

Every played match shows two team names with an emblem (Vikings, Conquérants,
Fighters, Lions de l'Atlas, Requins, Dragons, Éclairs, Titans). By default
each match gets two different teams automatically.

To choose them, add two columns to the **Matchs** sheet (anywhere):
`equipe_1` and `equipe_2`. Type one of the names above (capitals and accents
don't matter). Any other name works too and gets a shield emblem.
`score_lime` / `score_noir` are the scores of équipe 1 / équipe 2 (you can
rename them `score_1` / `score_2` if you prefer). The list of teams lives in
`lib/teams.ts`.

## Shoe rental

Players can rent turf shoes (20 MAD, sizes 38–45) when they book on the site.
Before each match, open **bookings**, filter the `match_id`, and look at
`shoe_size` (the player) and `guest_shoe_size` (their +1): those are the
pairs to bring. The site allows 2 pairs per size per match and shows a size
as "épuisé" when both are taken.

Guests who book on WhatsApp ask for a size in their message ("sous réserve
de disponibilité"): they're not counted by the site, so check the bookings
table before confirming. Run `supabase/migrations/0004_shoe_rental.sql` once
to enable this.

## Training sessions (Google Sheet, "Training" tab)

One row per session: `date`, `heure`, `terrain`, `quartier`, `note`
(optional). Several sessions on the same day are fine. Past sessions drop
off by themselves; add the next ones every week. To cancel a session,
delete its row. Don't change the date/time of a session people already
signed up for: add a new row and delete the old one. If the tab is empty or
not set up, the site shows the default schedule (mardi, jeudi, samedi
19:00). Sign-ups per session: Table Editor → **training_signups**
(`session_id` = date-heure). Requires `0005_training_sessions.sql`.

## Switch Off (weekend sessions)

Same as Training, in a **"SwitchOff"** tab of the Google Sheet (date, heure,
terrain, quartier, note). 20 places per session, 75 MAD (lib/switchoff.ts).
If the tab is empty or not connected, the site shows samedi et dimanche à
09:00. Who signed up: Table Editor → **switchoff_signups**. Requires
`0006_switch_off.sql`.
