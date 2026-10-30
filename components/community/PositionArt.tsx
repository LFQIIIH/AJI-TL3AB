import type { AwardCategory } from "@/lib/community";

/**
 * Pictogram-style player illustrations (drawn in-house, brand colours) for
 * each award: striker shooting, keeper diving, defender tackling, midfielder
 * on the ball. Meant for a dark (forest) background.
 */
export default function PositionArt({ category, className = "h-20 w-20" }: { category: AwardCategory; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ART[category]}
    </svg>
  );
}

const LIME = "#C7F36B";
const BALL = "#FFFFFF";
const FAINT = "#1D4A3A";

function Ball({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BALL} />
      <path d={`M${x - r * 0.35} ${y - r * 0.2} l${r * 0.35} ${-r * 0.25} l${r * 0.35} ${r * 0.25} l${-r * 0.13} ${r * 0.42} h${-r * 0.44} z`} fill="#12372A" />
    </g>
  );
}

const limbs = { stroke: LIME, strokeWidth: 9 };

const ART: Record<AwardCategory, React.ReactNode> = {
  // Striker: planted leg, shooting leg swung through, ball flying off.
  buteur: (
    <g>
      <path d="M96 74 l12 -4 M94 82 l14 0 M96 90 l12 4" stroke={FAINT} strokeWidth="4" />
      <circle cx="58" cy="20" r="10" fill={LIME} />
      <path d="M56 34 L48 62" {...limbs} />
      <path d="M55 40 L70 50 L82 44" {...limbs} />
      <path d="M53 40 L40 50 L30 44" {...limbs} />
      <path d="M48 62 L54 84 L48 106" {...limbs} />
      <path d="M48 62 L68 74 L84 72" {...limbs} />
      <Ball x={96} y={82} />
      <path d="M20 110 H100" stroke={FAINT} strokeWidth="4" />
    </g>
  ),
  // Goalkeeper: full-stretch dive towards the top corner.
  gardien: (
    <g>
      <path d="M8 104 V14 H112" stroke={FAINT} strokeWidth="5" />
      <circle cx="80" cy="44" r="10" fill={LIME} />
      <path d="M70 54 L44 70" {...limbs} />
      <path d="M74 50 L90 34 L98 24" {...limbs} />
      <path d="M68 56 L86 40 L96 34" {...limbs} />
      <circle cx="100" cy="22" r="5.5" fill={LIME} />
      <circle cx="98" cy="33" r="5.5" fill={LIME} />
      <path d="M44 70 L30 80 L18 96" {...limbs} />
      <path d="M44 70 L28 68 L16 74" {...limbs} />
      <Ball x={108} y={10} r={6.5} />
    </g>
  ),
  // Defender: sliding tackle along the ground to win the ball.
  defenseur: (
    <g>
      <path d="M10 104 H112" stroke={FAINT} strokeWidth="4" />
      <path d="M20 98 l-6 -6 M30 100 l-8 -4" stroke={FAINT} strokeWidth="4" />
      <circle cx="34" cy="54" r="10" fill={LIME} />
      <path d="M42 64 L62 84" {...limbs} />
      <path d="M42 66 L30 82 L24 96" {...limbs} />
      <path d="M44 62 L56 50 L64 42" {...limbs} />
      <path d="M62 84 L84 92 L102 96" {...limbs} />
      <path d="M62 84 L78 80 L90 70" {...limbs} />
      <Ball x={108} y={94} />
    </g>
  ),
  // Midfielder: head up, running with the ball, pass line ahead.
  milieu: (
    <g>
      <path d="M78 104 C 92 90, 100 70, 106 46" stroke={FAINT} strokeWidth="4" strokeDasharray="2 8" />
      <path d="M100 52 l6 -6 l2 8" stroke={FAINT} strokeWidth="4" />
      <circle cx="52" cy="18" r="10" fill={LIME} />
      <path d="M52 32 L48 60" {...limbs} />
      <path d="M51 38 L38 48 L36 60" {...limbs} />
      <path d="M51 38 L66 46 L76 40" {...limbs} />
      <path d="M48 60 L34 76 L38 98" {...limbs} />
      <path d="M48 60 L64 74 L74 88" {...limbs} />
      <Ball x={84} y={100} />
    </g>
  ),
};
