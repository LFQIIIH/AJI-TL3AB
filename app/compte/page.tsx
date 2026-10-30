import type { Metadata } from "next";
import { getMatches } from "@/lib/matches-source";
import AccountDashboard from "./AccountDashboard";
import AccountPanel from "./AccountPanel";

export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false },
};

// Match details (pitch, format…) for bookings; refreshed like the match lists.
export const revalidate = 300;

export default async function ComptePage() {
  const matches = await getMatches();
  return (
    <div className="container-page grid items-start gap-6 py-12 sm:py-16 lg:grid-cols-[1fr_24rem]">
      <div className="min-w-0 lg:order-1">
        <AccountDashboard matches={matches} />
      </div>
      <div className="lg:sticky lg:top-24 lg:order-2">
        <AccountPanel />
      </div>
    </div>
  );
}
