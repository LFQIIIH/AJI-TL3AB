import type { Metadata } from "next";
import AccountPanel from "./AccountPanel";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false },
};

export default function ComptePage() {
  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <AccountPanel />
    </div>
  );
}
