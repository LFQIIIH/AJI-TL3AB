import AdminNav from "../AdminNav";
import { requireStaff } from "@/lib/admin";
import PhotoManager from "./PhotoManager";

export default async function AdminPhotosPage() {
  const { role } = await requireStaff({ adminOnly: true });
  return (
    <>
      <AdminNav role={role} current="/admin/photos" title="Photos du site" />
      <p className="-mt-4 mb-6 max-w-2xl text-ink-muted">
        Les 8 photos les plus récentes s&apos;affichent sur la page d&apos;accueil, dans « Ça se passe comme ça ». Choisis de vraies photos de vos
        matchs : terrain, joueurs, photo d&apos;équipe. Demande l&apos;accord des personnes qu&apos;on reconnaît.
      </p>
      <PhotoManager />
    </>
  );
}
