import { avatarUrl } from "@/lib/avatar";

const COLORS = ["bg-primary", "bg-forest", "bg-[#B8733A]", "bg-[#3BA7C9]", "bg-[#7A5BB8]"];

/** Round profile photo, or a coloured circle with the first letter of the name. */
export default function Avatar({ name, path, size = 32, className = "" }: { name: string; path?: string | null; size?: number; className?: string }) {
  const url = avatarUrl(path);
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const color = COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
  const style = { width: size, height: size };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- already a 400 px square from the upload step
    <img src={url} alt="" width={size} height={size} loading="lazy" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${color} ${className}`}
    >
      {letter}
    </span>
  );
}
