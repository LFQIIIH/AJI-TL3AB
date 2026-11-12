import Link from "next/link";

export default function AccessDenied() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <p className="eyebrow">Espace admin</p>
      <h1 className="headline mt-3 text-4xl">Accès réservé</h1>
      <p className="mt-4 text-ink-muted">
        Cette page est réservée à l&apos;équipe AJI TL3AB (admin et capitaines). Si tu fais partie de l&apos;équipe, demande à
        l&apos;admin de t&apos;ajouter avec l&apos;e-mail de ton compte.
      </p>
      <Link href="/compte" className="btn-primary mt-6">
        Mon compte
      </Link>
    </div>
  );
}
