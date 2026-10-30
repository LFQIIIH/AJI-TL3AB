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
