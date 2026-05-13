import type { Metadata } from "next";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
