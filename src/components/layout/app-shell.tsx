import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar userName={session.displayName} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
