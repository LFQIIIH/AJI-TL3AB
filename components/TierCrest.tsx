import type { Tier } from "@/lib/points";

/** Club-crest badge for a monthly tier (star; a cut gem for Diamant). */
export default function TierCrest({ tier, className = "h-6 w-5" }: { tier: Tier; className?: string }) {
  return (
    <svg viewBox="0 0 46 52" className={className} role="img" aria-label={tier.label}>
      <path d="M23 2l19 7v14c0 13-8 22-19 27C12 45 4 36 4 23V9z" fill={tier.color} />
      <path d="M23 6.5l15 5.5v11c0 10.5-6.3 17.8-15 22-8.7-4.2-15-11.5-15-22V12z" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
      {tier.id === "diamant" ? (
        <path d="M14 21l4.5-6h9l4.5 6-9 12z M14 21h18 M18.5 15l4.5 6 4.5-6 M23 21v12" fill="#fff" fillOpacity=".92" stroke={tier.color} strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <path d="M23 13l3.5 7 7.5 1-5.5 5.3 1.4 7.7L23 30.4 16.1 34l1.4-7.7L12 21l7.5-1z" fill="#fff" fillOpacity=".92" />
      )}
    </svg>
  );
}
