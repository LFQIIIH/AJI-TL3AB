import type { Metadata } from "next";

// Staff area: never indexed (also blocked in robots.txt).
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="container-page py-8 sm:py-12">{children}</div>;
}
