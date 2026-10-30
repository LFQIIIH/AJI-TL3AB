import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";

/** Always-visible shortcut to ask a question on WhatsApp. */
export default function WhatsAppFab() {
  return (
    <a
      href={whatsappLink("Salam AJI TL3AB ! 3ndi so2al :")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="3ndek question ? Écris-nous sur WhatsApp"
      className="group fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary p-4 text-primary-ink shadow-lg shadow-forest/25 transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 sm:px-5"
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden text-sm font-bold sm:inline">3ndek question ?</span>
    </a>
  );
}
