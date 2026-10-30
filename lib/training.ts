// Physical training ("Prépa physique") — single source of truth for the page and sign-ups.

export const TRAINER_NAME = "Anas Mouatasim";

/** Weekdays with a session (0 = dimanche … 6 = samedi): mardi, jeudi, samedi. */
export const TRAINING_WEEKDAYS = [2, 4, 6] as const;

// TODO: confirm with the trainer — placeholders until then.
export const TRAINING_TIME = "19:00";
export const TRAINING_PLACE = "Marrakech · lieu précisé sur WhatsApp";

export const PRICE_PER_SESSION_MAD = 50;
export const PRICE_PER_MONTH_MAD = 200;

/** A session only goes ahead once this many people have signed up. */
export const MIN_PARTICIPANTS = 20;

/** How many upcoming sessions are open for sign-up. */
export const SESSIONS_SHOWN = 6;

const TZ = "Africa/Casablanca";
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const TRAINING_DAYS_LABEL = TRAINING_WEEKDAYS.map((d) => DAY_NAMES[d].toLowerCase()).join(", ").replace(/, ([^,]*)$/, " et $1");

/** "YYYY-MM-DD" for a Date, in Marrakech local time. */
function localDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/**
 * Next `count` session dates (YYYY-MM-DD), Marrakech time. Today counts until
 * the session start time has passed.
 */
export function upcomingSessionDates(count = SESSIONS_SHOWN, now: Date = new Date()): string[] {
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const dates: string[] = [];
  for (let i = 0; dates.length < count && i < 31; i++) {
    const date = localDate(new Date(now.getTime() + i * 86_400_000));
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!(TRAINING_WEEKDAYS as readonly number[]).includes(weekday)) continue;
    if (i === 0 && nowTime >= TRAINING_TIME) continue;
    dates.push(date);
  }
  return dates;
}

/** Sessions per month at 3/week, used to show the subscription saving. */
export const SESSIONS_PER_MONTH = Math.round((TRAINING_WEEKDAYS.length * 52) / 12);
