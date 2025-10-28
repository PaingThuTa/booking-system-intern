import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { auth } from "@/lib/auth";

// Using system fonts via Tailwind's font-sans; no external font fetches

export const metadata: Metadata = {
  title: "Min Intelligence internship Booking Portal",
  description: "Streamline Min Intelligence internship interview scheduling for admins and candidates.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthSessionProvider session={session}>{children}</AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
