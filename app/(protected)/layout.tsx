import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { auth } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Internship Booking Portal
            </Link>
            <p className="text-sm text-muted-foreground">
              Manage interview availability and reservations in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {session?.user ? (
              <>
                <DashboardNav role={session.user.role} />
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{session.user.name ?? session.user.email}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                    {session.user.role.toLowerCase()}
                  </span>
                  <SignOutButton />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
