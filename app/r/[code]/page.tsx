import type { Metadata } from "next";
import ReferralLanding from "./ReferralLanding";

export const metadata: Metadata = {
  title: "Invitation",
  description: "Un pote t'invite à jouer au foot avec AJI TL3AB à Marrakech.",
  robots: { index: false },
};

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReferralLanding code={code} />;
}
