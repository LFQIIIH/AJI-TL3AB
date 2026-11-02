import type { Metadata } from "next";
import PasswordForm from "./PasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe",
  robots: { index: false },
};

export default function PasswordPage() {
  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <PasswordForm />
    </div>
  );
}
