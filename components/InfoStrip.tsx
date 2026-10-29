import { Icon, type IconName } from "@/components/Icons";

export type InfoItem = { icon: IconName; label: string; value: string };

/** Key facts at a glance: icon + small label + bold value. */
export default function InfoStrip({ items, className = "" }: { items: InfoItem[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 bg-surface p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-ink">
            <Icon name={item.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{item.label}</dt>
            <dd className="mt-0.5 font-semibold leading-snug">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
