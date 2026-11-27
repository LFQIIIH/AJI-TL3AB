import { Ticket } from "lucide-react";
import { WhatsAppIcon } from "@/components/Icons";
import { PACK, PACK_SAVING_MAD, packRequestLink } from "@/lib/packs";

/**
 * Pack Régulier offer. "jouer": for match players (the main pitch).
 * "training": a small add-on note on the training page — the monthly pass
 * stays the best deal for training alone.
 */
export default function PackOffer({ variant, className = "" }: { variant: "jouer" | "training"; className?: string }) {
  const formats = PACK.formats.join(" ou ");
  if (variant === "training") {
    return (
      <div className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
        <p className="text-sm">
          <span className="font-semibold">Tu joues déjà nos matchs ?</span> Teste le training pour presque rien avec le{" "}
          <span className="font-semibold">{PACK.name}</span> : {PACK.matches} matchs ({formats}) + {PACK.trainings} trainings,{" "}
          <span className="font-bold text-primary">{PACK.priceMad} MAD</span>{" "}
          <span className="text-ink-muted">
            au lieu de <s>{PACK.listPriceMad}</s>, valable {PACK.validDays} jours.
          </span>
        </p>
        <a href={packRequestLink()} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0">
          <WhatsAppIcon /> Prendre le pack
        </a>
      </div>
    );
  }
  return (
    <section aria-labelledby="pack-regulier" className={`card overflow-hidden border-2 border-primary ${className}`}>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-ink" aria-hidden="true">
            <Ticket className="h-6 w-6" />
          </span>
          <div>
            <h2 id="pack-regulier" className="headline text-3xl sm:text-4xl">
              {PACK.name}
            </h2>
            <p className="mt-1 font-semibold">
              {PACK.matches} matchs ({formats}) + {PACK.trainings} trainings
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Joue chaque semaine et ajoute le training physique pour presque rien. Valable {PACK.validDays} jours, utilisé automatiquement quand tu
              réserves.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="leading-none">
            <span className="headline text-5xl text-primary">{PACK.priceMad}</span> <span className="text-sm font-semibold">MAD</span>
          </p>
          <p className="text-sm text-ink-muted">
            au lieu de <s>{PACK.listPriceMad} MAD</s> ·{" "}
            <span className="font-semibold text-ink">−{PACK_SAVING_MAD} MAD</span>
          </p>
          <a href={packRequestLink()} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto">
            <WhatsAppIcon /> Prendre le pack
          </a>
        </div>
      </div>
    </section>
  );
}
