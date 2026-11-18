import { Award, Crown, Flame, Handshake, Repeat, Sparkles } from "lucide-react";
import { BallIcon, GoalIcon } from "@/components/Icons";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  first: BallIcon,
  regular: Repeat,
  legend: Crown,
  goal: GoalIcon,
  hattrick: Sparkles,
  award: Award,
  streak: Flame,
  recruiter: Handshake,
};

/** Icon of an achievement badge (ids from computeBadges in lib/community.ts). */
export default function BadgeIcon({ id, className = "h-5 w-5" }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Award;
  return <Icon className={className} aria-hidden="true" />;
}
