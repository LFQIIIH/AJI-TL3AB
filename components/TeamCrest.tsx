import { teamEmblem, type TeamEmblem } from "@/lib/teams";

const LIME = "#C7F36B";
const FOREST = "#12372A";

/** Round team badge: lime emblem on forest, drawn in-house. */
export default function TeamCrest({ name, className = "h-12 w-12" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={`Emblème ${name}`}>
      <circle cx="24" cy="24" r="23" fill={FOREST} />
      <circle cx="24" cy="24" r="20.5" fill="none" stroke={LIME} strokeOpacity="0.35" strokeWidth="1.5" />
      {EMBLEMS[teamEmblem(name)]}
    </svg>
  );
}

const line = { stroke: LIME, strokeWidth: 3.2, strokeLinecap: "round" as const, fill: "none" };

const EMBLEMS: Record<TeamEmblem, React.ReactNode> = {
  // Vikings — horned helmet
  helmet: (
    <g fill={LIME}>
      <path d="M14 30a10 10 0 0 1 20 0z" />
      <rect x="13" y="29.5" width="22" height="4" rx="1.5" />
      <rect x="22.5" y="29.5" width="3" height="8" rx="1.5" />
      <path d="M15 25c-5-1-7-7-5-13 2 5 4 7 8 8z" />
      <path d="M33 25c5-1 7-7 5-13-2 5-4 7-8 8z" />
    </g>
  ),
  // Conquérants — crossed swords
  swords: (
    <g>
      <path d="M15 33L34 14M33 33L14 14" {...line} strokeWidth={3.4} />
      <path d="M11.5 29.5l7 7M29.5 36.5l7-7" {...line} />
      <path d="M15 33l-4 4M33 33l4 4" {...line} />
    </g>
  ),
  // Fighters — battle shield with a star
  shield: (
    <g>
      <path d="M24 9l12 4.5v9.5c0 7.5-5 13-12 16-7-3-12-8.5-12-16v-9.5z" fill={LIME} />
      <path d="M24 16.5l2 4.6 5 .4-3.8 3.3 1.2 4.9-4.4-2.7-4.4 2.7 1.2-4.9-3.8-3.3 5-.4z" fill={FOREST} />
    </g>
  ),
  // Lions de l'Atlas — paw print
  paw: (
    <g fill={LIME}>
      <ellipse cx="24" cy="30" rx="8" ry="6.5" />
      <circle cx="14.5" cy="21.5" r="3.4" />
      <circle cx="20" cy="15.5" r="3.4" />
      <circle cx="28" cy="15.5" r="3.4" />
      <circle cx="33.5" cy="21.5" r="3.4" />
    </g>
  ),
  // Requins — fin above the waves
  fin: (
    <g>
      <path d="M12 31c7-1 12-7 14-19 3 9 6 15 10 19z" fill={LIME} />
      <path d="M10 36c2.5-2.5 5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 7 0 4.5 2.5 7 0" {...line} strokeWidth={2.6} />
    </g>
  ),
  // Dragons — flame
  flame: (
    <g>
      <path d="M24 8c3 7 11 11 11 21a11 11 0 0 1-22 0c0-5 3-8 5-12 1 4 3 6 5 6-2-5-1-10 1-15z" fill={LIME} />
      <path d="M24 26c1.5 3 5 4.5 5 8a5 5 0 0 1-10 0c0-2.5 2-4 5-8z" fill={FOREST} />
    </g>
  ),
  // Éclairs — lightning bolt
  bolt: <path d="M27 7L13 27h9.5L19 41l16-21h-10z" fill={LIME} strokeLinejoin="round" />,
  // Titans — war hammer
  hammer: (
    <g fill={LIME}>
      <rect x="12" y="11" width="24" height="10" rx="2.5" />
      <rect x="21.5" y="20" width="5" height="19" rx="2" />
      <rect x="19" y="36" width="10" height="4" rx="2" />
    </g>
  ),
};
