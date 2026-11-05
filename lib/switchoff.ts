// "Switch Off": weekend sessions for busy professionals — training,
// mini-matches and activities. Sign-ups: switchoff_signups (0006_switch_off.sql).

export const SWITCHOFF_PRICE_MAD = 75;
/** Places per session (also enforced in Supabase). */
export const SWITCHOFF_CAPACITY = 20;
/** Default schedule when the sheet tab is empty: samedi (6) et dimanche (0) à 09:00. */
export const SWITCHOFF_WEEKDAYS = [6, 0] as const;
export const SWITCHOFF_TIME = "09:00";
