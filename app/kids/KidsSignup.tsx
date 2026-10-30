"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/config";

type KidsSignupProps = {
  label?: string;
  className?: string;
};

const MIN_AGE = 5;
const MAX_AGE = 14;

export default function KidsSignup({ label = "Réserver pour mon enfant", className = "btn-primary" }: KidsSignupProps) {
  const [open, setOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");

  const ageNum = Number(age);
  const valid = childName.trim().length > 0 && Number.isInteger(ageNum) && ageNum >= MIN_AGE && ageNum <= MAX_AGE;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const message = [
      "Salam AJI TL3AB ! Bghit nreservi l wldi / bnti f les activités dyal drari 👋",
      "",
      `👦 Prénom de l'enfant : ${childName.trim()}`,
      `🎂 Âge : ${ageNum} ans`,
      "",
      "Quelles sont les prochaines dates ?",
    ].join("\n");
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <WhatsAppIcon /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Réserver pour mon enfant">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Prénom de l&apos;enfant</span>
            <input
              className="input"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Ex : Adam"
              required
              autoFocus
              maxLength={60}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Âge</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={MIN_AGE}
              max={MAX_AGE}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={`${MIN_AGE} à ${MAX_AGE} ans`}
              required
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={!valid}>
            Continuer sur WhatsApp
          </button>
          <p className="text-center text-xs text-ink-muted">
            On vous répond sur WhatsApp avec les prochaines dates, l&apos;heure, le terrain et le prix.
          </p>
        </form>
      </Modal>
    </>
  );
}
