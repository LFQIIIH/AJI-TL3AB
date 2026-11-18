"use client";

import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";

/**
 * Shortcut to ask a question on WhatsApp. It slides away while the visitor
 * scrolls down (so it never covers what they're reading or tapping) and comes
 * back when they scroll up or reach the top.
 */
export default function WhatsAppFab() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) > 8) {
          setHidden(y > last && y > 120);
          last = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={whatsappLink("Salam AJI TL3AB ! 3ndi so2al :")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="3ndek question ? Écris-nous sur WhatsApp"
      className={`group fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary p-4 text-primary-ink shadow-lg shadow-forest/25 transition duration-300 hover:bg-primary-hover focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none sm:bottom-6 sm:right-6 sm:px-5 [body:has(#mobile-tabbar)_&]:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:[body:has(#mobile-tabbar)_&]:bottom-6 ${
        hidden ? "pointer-events-none translate-y-24 opacity-0" : ""
      }`}
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden text-sm font-bold sm:inline">3ndek question ?</span>
    </a>
  );
}
