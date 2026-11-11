import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { SyncProvider } from "@/components/offline/sync-provider";
import { SyncStatus } from "@/components/offline/sync-status";
import { requireOwner } from "@/lib/owner";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <>
      <main className="mx-auto max-w-md space-y-4 px-4 pt-4 pb-28">
        <SyncStatus />
        <div>{children}</div>
      </main>
      <BottomNav />
      <SyncProvider />
    </>
  );
}
