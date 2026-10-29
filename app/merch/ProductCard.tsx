"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/data/products";
import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";

export default function ProductCard({ product }: { product: Product }) {
  const singleSize = product.sizes.length === 1;
  const [size, setSize] = useState<string | null>(singleSize ? product.sizes[0] : null);
  const [imageIdx, setImageIdx] = useState(0);

  const orderHref = size
    ? whatsappLink(
        [
          `Salam AJI TL3AB ! Bghit ncommandi 🛒`,
          "",
          `👕 ${product.name}${product.preorder ? " (précommande)" : ""}`,
          `📏 Taille : ${size}`,
          `💰 ${product.priceMad} MAD`,
        ].join("\n"),
      )
    : undefined;

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-surface">
        <Image
          src={product.images[imageIdx]}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          unoptimized
        />
        {product.preorder && (
          <span className="absolute left-3 top-3 rounded-full bg-highlight px-3 py-1 text-xs font-bold uppercase tracking-wide text-highlight-ink">
            Précommande
          </span>
        )}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setImageIdx(i)}
                aria-label={`Image ${i + 1}`}
                aria-pressed={i === imageIdx}
                className={`h-2.5 w-2.5 rounded-full transition ${i === imageIdx ? "bg-primary" : "bg-ink/30 hover:bg-ink/60"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="headline text-3xl">{product.name}</h2>
          <p className="shrink-0 pt-1">
            <span className="headline text-2xl">{product.priceMad}</span> <span className="text-sm text-ink-muted">MAD</span>
          </p>
        </div>
        {product.description && <p className="mt-2 text-sm text-ink-muted">{product.description}</p>}

        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">Taille</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`chip min-w-12 px-3 py-1.5 ${size === s ? "chip-on" : "chip-off"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-auto pt-6">
          {orderHref ? (
            <a href={orderHref} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
              <WhatsAppIcon /> {product.preorder ? "Précommander" : "Commander"}
            </a>
          ) : (
            <button type="button" className="btn-primary w-full" disabled>
              Choisis ta taille
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
