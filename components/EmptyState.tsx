/**
 * Illustrated empty screen: a dashed pitch with a lime ball, a title, a line
 * of text and optional actions (no matches, no results, empty ranking…).
 */
export default function EmptyState({
  title,
  text,
  children,
  className = "",
}: {
  title: string;
  text?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card flex flex-col items-center px-6 py-10 text-center ${className}`}>
      <svg viewBox="0 0 160 100" className="h-24 w-40 text-line-strong" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2" strokeDasharray="5 4">
          <rect x="4" y="4" width="152" height="92" rx="4" />
          <path d="M80 4v92" />
          <circle cx="80" cy="50" r="14" />
          <path d="M4 32h18v36H4M156 32h-18v36h18" />
        </g>
        <circle cx="106" cy="64" r="7" className="fill-highlight stroke-forest" strokeWidth="2" />
      </svg>
      <p className="headline mt-5 text-3xl">{title}</p>
      {text && <p className="mt-2 max-w-sm text-ink-muted">{text}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
