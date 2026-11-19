import Image from "next/image";
import type { SitePhoto } from "@/lib/site-photos";

/** "En images": real photos of the matches, added in /admin/photos. Swipe on phones. */
export default function PhotoStrip({ photos }: { photos: SitePhoto[] }) {
  if (!photos.length) return null;
  return (
    <section aria-labelledby="en-images" className="container-page pb-12 sm:pb-24">
      <p className="eyebrow">Sur le terrain</p>
      <h2 id="en-images" className="headline mt-3 text-4xl sm:text-7xl">
        Ça se passe comme ça
      </h2>
      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {photos.map((p, i) => (
          <li key={p.name} className="relative aspect-[4/5] w-[52vw] max-w-[15rem] shrink-0 snap-start overflow-hidden rounded-2xl bg-canvas-deep sm:w-auto sm:max-w-none">
            <Image
              src={p.url}
              alt={`Match AJI TL3AB à Marrakech, photo ${i + 1}`}
              fill
              sizes="(min-width: 640px) 25vw, 52vw"
              className="object-cover"
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
