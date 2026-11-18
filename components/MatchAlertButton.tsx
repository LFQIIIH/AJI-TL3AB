import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";

/** "Préviens-moi sur WhatsApp": asks to be told when new matches are published. */
export default function MatchAlertButton() {
  return (
    <a
      href={whatsappLink("Salam AJI TL3AB ! Préviens-moi quand de nouveaux matchs sont publiés.")}
      target="_blank"
      rel="noopener noreferrer"
      className="btn bg-[#25D366] text-[#08361c] hover:brightness-95"
    >
      <WhatsAppIcon className="h-5 w-5" />
      Préviens-moi sur WhatsApp
    </a>
  );
}
