import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-10">{children}</main>;
}
